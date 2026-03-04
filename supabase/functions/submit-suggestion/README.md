Deploy this Edge Function to your **active** Supabase project.

Purpose:
- Accepts poll suggestions from signed-in users.
- Optionally verifies hCaptcha if `HCAPTCHA_SECRET` is set.

Env vars:
- Optional:
  - `HCAPTCHA_SECRET`

The active project automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

