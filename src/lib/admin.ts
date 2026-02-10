import type { Session } from '@supabase/supabase-js'

function getAdminEmailsFromEnv(): string[] {
  const candidates = [
    import.meta.env.VITE_ADMIN_EMAIL,
    import.meta.env.VITE_ADMIN_EMAIL_2,
    import.meta.env.VITE_ADMIN_EMAIL_3,
    import.meta.env.VITE_ADMIN_EMAIL_4,
    import.meta.env.VITE_ADMIN_EMAIL_5,
    import.meta.env.VITE_ADMIN_EMAIL_6,
    import.meta.env.VITE_ADMIN_EMAIL_7,
    import.meta.env.VITE_ADMIN_EMAIL_8,
    import.meta.env.VITE_ADMIN_EMAIL_9,
    import.meta.env.VITE_ADMIN_EMAIL_10,
  ]

  return candidates
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean)
}

export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email ?? ''
  if (!email) return false

  const admins = getAdminEmailsFromEnv()
  if (admins.length === 0) return false

  return admins.includes(email.toLowerCase())
}

export function isAdminEnvConfigured(): boolean {
  return getAdminEmailsFromEnv().length > 0
}
