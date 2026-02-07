Deploy this Edge Function to your **active** Supabase project and schedule it to run at **midnight UTC**.

- Required env vars on the function:
  - `BANK_SUPABASE_URL`
  - `BANK_SUPABASE_SERVICE_ROLE_KEY`

The active project automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Suggested cron: `0 0 * * *` (00:00 UTC)
