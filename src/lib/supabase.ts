import { createClient } from '@supabase/supabase-js'
import { requireEnv } from './env'

export const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY'),
)

export const pollBankSupabase =
  import.meta.env.VITE_POLL_BANK_SUPABASE_URL &&
  import.meta.env.VITE_POLL_BANK_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_POLL_BANK_SUPABASE_URL,
        import.meta.env.VITE_POLL_BANK_SUPABASE_ANON_KEY,
      )
    : null
