import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCountdown, nextUtcMidnight, utcDateId } from '../lib/utc'
import { useAuth } from '../state/auth'

type DailyPollRow = {
  id: string
  poll_date: string
  question: string
  options: string[]
  created_by_user_id?: string | null
  created_by_username?: string | null
  created_by_display_name?: string | null
}

type VoteRow = {
  option_index: number
}

type ResultRow = {
  option_index: number
  votes: number
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function HomePage() {
  const { session, isLoading: authLoading } = useAuth()

  const [poll, setPoll] = useState<DailyPollRow | null>(null)
  const [pollLoading, setPollLoading] = useState(true)
  const [pollError, setPollError] = useState<string | null>(null)

  const [myVote, setMyVote] = useState<VoteRow | null>(null)
  const [voteLoading, setVoteLoading] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [countdown, setCountdown] = useState('00:00:00')
  const [creator, setCreator] = useState<{ username: string | null; displayName: string | null } | null>(
    null,
  )

  const today = useMemo(() => utcDateId(), [])

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextUtcMidnight().getTime() - Date.now()))
    tick()
    const t = window.setInterval(tick, 250)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setPollLoading(true)
      setPollError(null)
      setPoll(null)
      setMyVote(null)
      setResults(null)
      setCreator(null)

      const primary = await supabase
        .from('daily_polls')
        .select('id,poll_date,question,options,created_by_user_id,created_by_username,created_by_display_name')
        .eq('poll_date', today)
        .maybeSingle()

      let data = primary.data as DailyPollRow | null
      let error = primary.error

      // Back-compat: if DB hasn't been migrated yet, retry without the attribution column.
      if (error && /(created_by_display_name|created_by_username|created_by_user_id|column .* does not exist)/i.test(error.message)) {
        const fallback = await supabase
          .from('daily_polls')
          .select('id,poll_date,question,options')
          .eq('poll_date', today)
          .maybeSingle()
        data = (fallback.data as DailyPollRow | null) && {
          ...(fallback.data as DailyPollRow),
          created_by_display_name: 'Unknown',
          created_by_username: null,
          created_by_user_id: null,
        }
        error = fallback.error
      }

      if (!isMounted) return
      if (error) {
        setPollError(error.message)
        setPollLoading(false)
        return
      }

      if (!data) {
        setPoll(null)
        setPollLoading(false)
        return
      }

      setPoll(data as DailyPollRow)
      setPollLoading(false)
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [today])

  useEffect(() => {
    let mounted = true
    async function loadCreator() {
      if (!poll?.created_by_user_id) {
        setCreator(null)
        return
      }

      // Prefer live profile privacy over stored fields.
      const res = await supabase
        .from('profiles')
        .select('username,display_name,is_public')
        .eq('id', poll.created_by_user_id)
        .maybeSingle()

      if (!mounted) return
      if (res.error) {
        setCreator(null)
        return
      }

      const p = res.data as { username?: string | null; display_name?: string | null; is_public?: boolean | null } | null
      if (!p || p.is_public === false) {
        setCreator(null)
        return
      }

      setCreator({
        username: p.username ?? poll.created_by_username ?? null,
        displayName: p.display_name ?? poll.created_by_display_name ?? null,
      })
    }
    void loadCreator()
    return () => {
      mounted = false
    }
  }, [poll])

  useEffect(() => {
    let isMounted = true

    async function loadVoteAndResults() {
      if (!poll) return

      setVoteError(null)

      if (!session) {
        setMyVote(null)
        setResults(null)
        return
      }

      const myVoteRes = await supabase
        .from('votes')
        .select('option_index')
        .eq('poll_id', poll.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (myVoteRes.error) {
        setVoteError(myVoteRes.error.message)
        setMyVote(null)
        setResults(null)
        return
      }

      const vote = (myVoteRes.data as VoteRow) ?? null
      setMyVote(vote)

      if (!vote) {
        setResults(null)
        return
      }

      const resultsRes = await supabase
        .from('vote_counts')
        .select('option_index,votes')
        .eq('poll_id', poll.id)

      if (!isMounted) return

      if (resultsRes.error) setVoteError(resultsRes.error.message)
      else setResults((resultsRes.data as ResultRow[]) ?? [])
    }

    void loadVoteAndResults()
    return () => {
      isMounted = false
    }
  }, [poll, session])

  const totalVotes = useMemo(
    () => (results ?? []).reduce((sum, r) => sum + (r.votes ?? 0), 0),
    [results],
  )

  async function castVote(optionIndex: number) {
    if (!poll) return
    if (!session) return
    setVoteLoading(true)
    setVoteError(null)
    try {
      const { error } = await supabase.from('votes').insert({
        poll_id: poll.id,
        user_id: session.user.id,
        option_index: optionIndex,
      })
      if (error) throw error
      setMyVote({ option_index: optionIndex })

      const { data, error: resultsError } = await supabase
        .from('vote_counts')
        .select('option_index,votes')
        .eq('poll_id', poll.id)
      if (resultsError) throw resultsError
      setResults((data as ResultRow[]) ?? [])
    } catch (e) {
      setVoteError(e instanceof Error ? e.message : String(e))
    } finally {
      setVoteLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-300">Today (UTC): {today}</div>
            <div className="text-xs text-slate-400">Next poll in {countdown}</div>
          </div>
          <button
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      </div>

      {pollLoading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-10 w-full animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-white/10" />
        </div>
      ) : pollError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-200">
          {pollError}
        </div>
      ) : !poll ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-lg font-semibold">No poll posted yet.</div>
          <div className="mt-2 text-sm text-slate-300">
            This app resets at midnight UTC. If you just set it up, deploy the daily selector (Edge
            Function + Cron) or insert today’s poll into `daily_polls`.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-sm text-slate-300">Daily poll</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{poll.question}</h1>
          <div className="mt-2 text-sm text-slate-300">
            Created by{' '}
            {creator?.username ? (
              <Link
                to={`/u/${creator.username}`}
                className="font-semibold text-slate-100 hover:underline"
              >
                {creator.displayName ?? `@${creator.username}`}
              </Link>
            ) : creator?.displayName ? (
              <span className="font-semibold text-slate-100">{creator.displayName}</span>
            ) : (
              <span className="font-semibold text-slate-100">Unknown</span>
            )}
          </div>

          {voteError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {voteError}
            </div>
          ) : null}

          {authLoading ? (
            <div className="mt-5 h-10 w-40 animate-pulse rounded bg-white/10" />
          ) : !session ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-sm text-slate-200">Sign in to vote.</div>
              <div className="mt-3">
                <Link
                  to="/auth"
                  className="inline-flex rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
                >
                  Sign in
                </Link>
              </div>
            </div>
          ) : myVote ? (
            <div className="mt-5 text-sm text-slate-300">
              You voted: <span className="font-semibold text-slate-100">{poll.options[myVote.option_index]}</span>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {poll.options.map((opt, idx) => (
                <button
                  key={idx}
                  className="group rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left hover:border-indigo-400/40 hover:bg-black/40 disabled:opacity-60"
                  disabled={voteLoading}
                  onClick={() => void castVote(idx)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{opt}</span>
                    <span className="text-xs text-slate-400 group-hover:text-slate-300">
                      Vote
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {myVote ? (
            <div className="mt-6">
              <div className="text-sm font-semibold">Results</div>
              <div className="mt-3 grid gap-2">
                {poll.options.map((opt, idx) => {
                  const votes = (results ?? []).find((r) => r.option_index === idx)?.votes ?? 0
                  const percent = pct(votes, totalVotes)
                  return (
                    <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="font-medium">{opt}</div>
                        <div className="text-slate-300">
                          {votes} · {percent}%
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-white/10">
                        <div className="h-full bg-indigo-500/80" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-slate-400">Total votes: {totalVotes}</div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
              Vote to reveal results.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
