/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_EMAIL?: string
  readonly VITE_ADMIN_EMAIL_2?: string
  readonly VITE_ADMIN_EMAIL_3?: string
  readonly VITE_ADMIN_EMAIL_4?: string
  readonly VITE_ADMIN_EMAIL_5?: string
  readonly VITE_ADMIN_EMAIL_6?: string
  readonly VITE_ADMIN_EMAIL_7?: string
  readonly VITE_ADMIN_EMAIL_8?: string
  readonly VITE_ADMIN_EMAIL_9?: string
  readonly VITE_ADMIN_EMAIL_10?: string
  readonly VITE_HCAPTCHA_SITE_KEY?: string

  // Optional: if you want the client to read from a separate "poll bank" project.
  readonly VITE_POLL_BANK_SUPABASE_URL?: string
  readonly VITE_POLL_BANK_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
