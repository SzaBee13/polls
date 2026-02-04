/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Optional: if you want the client to read from a separate "poll bank" project.
  readonly VITE_POLL_BANK_SUPABASE_URL?: string
  readonly VITE_POLL_BANK_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
