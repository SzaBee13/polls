# AGENT.MD

Quick repo notes for coding agents.

## Project

- Stack: React + TypeScript + Vite + Supabase.
- Main app code: `src/`
- Supabase SQL/functions: `supabase/`

## Code style

- Use **2 spaces** indentation.
- Prefer readable, explicit code over clever one-liners.
- Keep auth and admin checks **fail-closed**.

## Validation

- Run:
  - `npm run lint`
  - `npx tsc --noEmit -p tsconfig.app.json`
  - `npx tsc --noEmit -p tsconfig.node.json`
  - `npm run build` (optional; may be slow in CI)

## Admin/security reminders

- Keep admin checks **fail-closed**: no admin env → no admin.
- Handle auth API errors explicitly.
- When a flow spans active+bank projects, include rollback or compensating behavior.

## Environment variables

- App (Vercel + local): see `.env.example`
  - Admins: `VITE_ADMIN_EMAIL` plus `VITE_ADMIN_EMAIL_2` ... `_10`
- Edge Functions (active Supabase project):
  - Admins: `ADMIN_EMAIL` plus `ADMIN_EMAIL_2` ... `_10`
  - Bank access: `BANK_SUPABASE_URL`, `BANK_SUPABASE_SERVICE_ROLE_KEY`
  - Captcha verify (optional): `HCAPTCHA_SECRET` (used by `submit-suggestion`)

## Supabase notes

- `create table if not exists ...` does not add new columns: use `alter table ... add column if not exists ...` for back-compat.
- RLS should be explicit; avoid “RLS enabled, no policy” warnings unless intentionally private.
- Profile privacy (`profiles.is_public`) must be respected by public endpoints/features.

## Edge Functions layout

- `select-daily-poll`: midnight UTC cron, picks from bank and inserts to active `daily_polls`
- `submit-suggestion`: inserts suggestions, optional hCaptcha verification
- `admin-suggestions`: admin list of suggestions
- `review-suggestion`: admin approve/reject; approve inserts into bank (with attribution when profile is public)

## Vercel routing

This is a SPA. `vercel.json` rewrites all routes to `/` so refresh/direct load of `/terms`, `/privacy`, `/u/:username`, etc. works.
