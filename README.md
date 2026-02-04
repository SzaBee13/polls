# Polls That Shouldn’t Exist

Daily polls like “Is cereal a soup” or “Would you survive 1400s Europe”.

- New poll every day at **00:00 UTC**
- **Supabase Auth** (email/password + Google)
- **One vote per user per poll**

## Run locally

1) Install deps: `npm install`
2) Create `.env` from `.env.example` and fill in your **active** Supabase project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3) Start: `npm run dev`

## Supabase setup

This repo is designed for **two Supabase projects**:

- **Active project**: stores `daily_polls`, `votes`, and public `vote_counts`
- **Bank project**: stores a pool of “not currently running” polls

### Active project (required)

1) Run SQL in `supabase/active/schema.sql` (SQL Editor).
2) In Auth settings, enable:
   - Email/password
   - Google provider (add redirect URL: your site origin, e.g. `http://localhost:5173`)

### Bank project (optional but matches your spec)

1) Run SQL in `supabase/bank/schema.sql`.
2) (Optional) Seed example polls with `supabase/bank/seed.sql`.

## Daily selection (midnight UTC)

Deploy `supabase/functions/select-daily-poll` to the **active** project and schedule it at midnight UTC.

The function:
- Checks if today’s poll exists (idempotent)
- Picks a random unused poll from the bank project
- Inserts it into `daily_polls`
- Marks the bank poll as `used_at = now()`

See `supabase/functions/select-daily-poll/README.md` for required env vars and the suggested cron.

## Poll suggestions + admin review

- Users can submit suggestions at `/suggest` (stored in the active DB table `poll_suggestions`).
- Admin review is at `/admin` (UI checks `VITE_ADMIN_EMAIL`, but the Edge Function enforces admin server-side).
- To enable admin actions, set the Edge Function env var `ADMIN_EMAIL` (defaults to `miabajodlol@gmail.com` if not set).

## hCaptcha (optional, recommended)

To protect `/suggest` from bots:

- Add `VITE_HCAPTCHA_SITE_KEY` to your app env (Vercel + local).
- Add `HCAPTCHA_SECRET` to the **select-daily-poll** Edge Function env vars (active Supabase project).
