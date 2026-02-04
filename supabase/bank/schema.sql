-- Poll bank schema (separate Supabase project recommended)

create table if not exists public.poll_bank (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  is_active boolean not null default true,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.poll_bank enable row level security;

-- Keep the bank private by default; only service role (Edge Function) should read/write.
-- If you want a simple admin UI, add authenticated policies here.

