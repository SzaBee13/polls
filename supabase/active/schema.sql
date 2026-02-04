-- Active project schema (daily poll + votes + public results)

create table if not exists public.daily_polls (
  id uuid primary key default gen_random_uuid(),
  poll_date date not null unique,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
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

-- Never allow client updates/deletes on votes or vote_counts

