import type { Session } from '@supabase/supabase-js'

const DEFAULT_ADMIN_EMAIL = 'miabajodlol@gmail.com'

export function isAdmin(session: Session | null): boolean {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
  const email = session?.user?.email ?? ''
  return email.toLowerCase() === adminEmail.toLowerCase()
}

