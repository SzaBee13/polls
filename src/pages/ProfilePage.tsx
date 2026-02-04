import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ProfileRow } from '../lib/profile'
import { getProfileByUsername } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { utcDateId } from '../lib/utc'

type VoteHistoryRow = {
  poll_date: string
  option_index: number
  daily_polls: { question: string; options: unknown }[] | null
}

export function ProfilePage() {
  const params = useParams()
  const username = params.username ?? ''
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [history, setHistory] = useState<VoteHistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = useMemo(() => utcDateId(), [])

  useEffect(() => {
    let mounted = true
    async function load() {
      setError(null)
      setProfile(null)
      setHistory(null)
      try {
        const p = await getProfileByUsername(username)
        if (!mounted) return
        if (!p) {
          setProfile(null)
          setHistory([])
          return
        }
        setProfile(p)

        const { data, error: e } = await supabase
          .from('public_vote_history')
          .select('poll_date,option_index,daily_polls(question,options)')
          .eq('user_id', p.id)
          .order('poll_date', { ascending: false })
          .limit(100)
        if (e) throw e
        setHistory((data as unknown as VoteHistoryRow[]) ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [username])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (history === null) {
    return <div className="h-10 w-40 animate-pulse rounded bg-white/10" />
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">User not found.</div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar_url ?? '/logo.svg'}
            alt=""
            className="h-14 w-14 rounded-2xl border border-white/10 bg-black/30 object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              {profile.display_name ?? profile.username}
            </div>
            <div className="text-sm text-slate-300">@{profile.username}</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-400">
          Vote history is public, but today’s vote ({today} UTC) stays hidden until tomorrow.
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Vote history</div>
            <div className="text-sm text-slate-300">Last {history.length} polls (up to 100).</div>
          </div>
          <Link to="/" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
            Back to today
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">No public votes yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {history.map((v, idx) => {
              const poll = v.daily_polls?.[0] ?? null
              const question = poll?.question ?? 'Unknown poll'
              const options = Array.isArray((poll as { options?: unknown } | null)?.options)
                ? ((poll as { options: unknown[] }).options as string[])
                : []
              const optionText = options[v.option_index] ?? `Option #${v.option_index + 1}`
              return (
                <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs text-slate-400">{v.poll_date} UTC</div>
                  <div className="mt-1 font-medium">{question}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    Voted: <span className="text-slate-100">{optionText}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
