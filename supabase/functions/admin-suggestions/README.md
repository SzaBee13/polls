Deploy this Edge Function to your **active** Supabase project.

Purpose:
- Admin-only list of poll suggestions (pending/approved/rejected).

Env vars:
- `ADMIN_EMAIL` (and optionally `ADMIN_EMAIL_2` ... `_10`)

The active project automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

