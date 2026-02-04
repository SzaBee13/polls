import { supabase } from './supabase'

export type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_public?: boolean | null
  created_at: string
  updated_at: string
}

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,is_public,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow) ?? null
}

export async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,is_public,created_at,updated_at')
    .eq('username', username)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow) ?? null
}

export async function upsertMyProfile(
  row: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'avatar_url'> & {
    is_public?: boolean | null
    updated_at: string
  },
): Promise<void> {
  const attempt = await supabase.from('profiles').upsert(row)
  if (!attempt.error) return

  // Back-compat if DB schema hasn't been migrated yet.
  if (/is_public|column .* does not exist/i.test(attempt.error.message)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { is_public: _ignore, ...fallback } = row
    const second = await supabase.from('profiles').upsert(fallback)
    if (second.error) throw second.error
    return
  }

  throw attempt.error
}
