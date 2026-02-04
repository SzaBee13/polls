-- Active project schema (daily poll + votes + public results)

create table if not exists public.daily_polls (
  id uuid primary key default gen_random_uuid(),
  poll_date date not null unique,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  created_by_user_id uuid null,
  created_by_display_name text null,
  source_project text null,
  source_poll_id uuid null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.daily_polls(id) on delete cascade,
  poll_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index int not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.vote_counts (
  poll_id uuid not null references public.daily_polls(id) on delete cascade,
  option_index int not null,
  votes int not null default 0,
  primary key (poll_id, option_index)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.init_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  option_count int;
begin
  option_count := jsonb_array_length(new.options);
  insert into public.vote_counts (poll_id, option_index, votes)
  select new.id, i, 0
  from generate_series(0, option_count - 1) as i
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_init_vote_counts on public.daily_polls;
create trigger trg_init_vote_counts
after insert on public.daily_polls
for each row execute function public.init_vote_counts();

create or replace function public.prepare_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  poll_options_len int;
begin
  -- Enforce user_id and poll_date server-side.
  new.user_id := auth.uid();

  select poll_date, jsonb_array_length(options)
    into new.poll_date, poll_options_len
  from public.daily_polls
  where id = new.poll_id;

  if new.poll_date is null then
    raise exception 'Invalid poll_id';
  end if;

  if new.option_index < 0 or new.option_index >= poll_options_len then
    raise exception 'Invalid option_index';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prepare_vote on public.votes;
create trigger trg_prepare_vote
before insert on public.votes
for each row execute function public.prepare_vote();

create or replace function public.bump_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vote_counts (poll_id, option_index, votes)
  values (new.poll_id, new.option_index, 1)
  on conflict (poll_id, option_index)
  do update set votes = public.vote_counts.votes + 1;
  return new;
end;
$$;

drop trigger if exists trg_bump_vote_counts on public.votes;
create trigger trg_bump_vote_counts
after insert on public.votes
for each row execute function public.bump_vote_counts();

-- RLS
alter table public.daily_polls enable row level security;
alter table public.votes enable row level security;
alter table public.vote_counts enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public_read_daily_polls" on public.daily_polls;
create policy "public_read_daily_polls"
on public.daily_polls
for select
using (true);

drop policy if exists "public_read_vote_counts" on public.vote_counts;
create policy "public_read_vote_counts"
on public.vote_counts
for select
using (true);

drop policy if exists "user_read_own_votes" on public.votes;
create policy "user_read_own_votes"
on public.votes
for select
using (auth.uid() = user_id);

drop policy if exists "user_insert_vote" on public.votes;
create policy "user_insert_vote"
on public.votes
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "public_read_profiles" on public.profiles;
create policy "public_read_profiles"
on public.profiles
for select
using (is_public = true or auth.uid() = id);

drop policy if exists "user_upsert_own_profile" on public.profiles;
create policy "user_upsert_own_profile"
on public.profiles
for insert
with check (auth.role() = 'authenticated' and auth.uid() = id);

drop policy if exists "user_update_own_profile" on public.profiles;
create policy "user_update_own_profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.poll_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  bank_poll_id uuid null,
  decided_by uuid null references auth.users(id) on delete set null,
  decided_at timestamptz null,
  decision_reason text null,
  created_at timestamptz not null default now()
);

create or replace function public.prepare_poll_suggestion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.status := 'pending';
  new.bank_poll_id := null;
  new.decided_by := null;
  new.decided_at := null;
  new.decision_reason := null;
  return new;
end;
$$;

drop trigger if exists trg_prepare_poll_suggestion on public.poll_suggestions;
create trigger trg_prepare_poll_suggestion
before insert on public.poll_suggestions
for each row execute function public.prepare_poll_suggestion();

alter table public.poll_suggestions enable row level security;

drop policy if exists "user_insert_suggestion" on public.poll_suggestions;
create policy "user_insert_suggestion"
on public.poll_suggestions
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "user_read_own_suggestions" on public.poll_suggestions;
create policy "user_read_own_suggestions"
on public.poll_suggestions
for select
using (auth.uid() = user_id);

-- Public vote history (hides today's votes via RLS).
create table if not exists public.public_vote_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  poll_id uuid not null references public.daily_polls(id) on delete cascade,
  poll_date date not null,
  option_index int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, poll_id)
);

create or replace function public.record_public_vote_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_vote_history (user_id, poll_id, poll_date, option_index, created_at)
  values (new.user_id, new.poll_id, new.poll_date, new.option_index, new.created_at)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_record_public_vote_history on public.votes;
create trigger trg_record_public_vote_history
after insert on public.votes
for each row execute function public.record_public_vote_history();

alter table public.public_vote_history enable row level security;

drop policy if exists "public_read_vote_history_after_day" on public.public_vote_history;
create policy "public_read_vote_history_after_day"
on public.public_vote_history
for select
using (
  auth.uid() = user_id
  or (
    poll_date < (timezone('utc', now())::date)
    and exists (
      select 1
      from public.profiles p
      where p.id = public_vote_history.user_id
        and p.is_public = true
    )
  )
);

-- Never allow client updates/deletes on votes or vote_counts
