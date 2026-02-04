Deploy this Edge Function to your **active** Supabase project and schedule it to run at **midnight UTC**.

- Required env vars on the function:
  - `BANK_SUPABASE_URL`
  - `BANK_SUPABASE_SERVICE_ROLE_KEY`
- Optional (for admin actions):
  - `ADMIN_EMAIL` (defaults to `miabajodlol@gmail.com`)

The active project automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Suggested cron: `0 0 * * *` (00:00 UTC)

## Extra actions (admin + suggestions)

This function also handles admin-only actions (called by the app via `supabase.functions.invoke('select-daily-poll', ...)`):

- `action: "adminListSuggestions"` → returns pending suggestions
- `action: "reviewSuggestion"` → approve/reject a suggestion (approve inserts into the bank DB)
