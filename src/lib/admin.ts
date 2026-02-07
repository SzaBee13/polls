import type { Session } from '@supabase/supabase-js'

const DEFAULT_ADMIN_EMAIL = 'miabajodlol@gmail.com'

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

  const list = candidates
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean)

  return list.length > 0 ? list : [DEFAULT_ADMIN_EMAIL.toLowerCase()]
}

export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email ?? ''
  const admins = getAdminEmailsFromEnv()
  return admins.includes(email.toLowerCase())
}
