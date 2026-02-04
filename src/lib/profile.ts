import { supabase } from './supabase'

export type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow) ?? null
}

export async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,created_at,updated_at')
    .eq('username', username)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow) ?? null
}

