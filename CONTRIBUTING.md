# Contributing

Thanks for contributing to **Polls That Shouldn’t Exist**.

## Quick start

### 1) Install

- Node.js 18+ recommended
- `npm install`

### 2) Environment

Create `.env` based on `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_HCAPTCHA_SITE_KEY`
- `VITE_ADMIN_EMAIL` (and `VITE_ADMIN_EMAIL_2` ... `_10`)

### 3) Run

- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit -p tsconfig.app.json`

## Supabase architecture

This repo assumes **two Supabase projects**:

- **Active project**: `daily_polls`, `votes`, `vote_counts`, `profiles`, `poll_suggestions`, `public_vote_history`
- **Bank project**: `poll_bank` (pool of unused polls)

SQL:

- Active: `supabase/active/schema.sql`
- Bank: `supabase/bank/schema.sql`

Edge Functions (deploy to **active** project):

- `select-daily-poll` (cron @ 00:00 UTC)
- `submit-suggestion`
- `admin-suggestions`
- `review-suggestion`

## Development guidelines

### Security & privacy

- Keep all auth/admin checks **fail-closed**.
- Never expose service role keys to the client.
- If a feature touches public profile/vote history, ensure it respects `profiles.is_public`.

### RLS and schema changes

If you add a new column to an existing table, remember:

- `create table if not exists ...` **will not** update existing tables
- include `alter table ... add column if not exists ...` for back-compat

### Style

- TypeScript + React function components
- Prefer clear, explicit code

## PR checklist

- `npm run lint`
- `npx tsc --noEmit -p tsconfig.app.json`
- Update docs if you changed env vars, DB schema, or edge functions
