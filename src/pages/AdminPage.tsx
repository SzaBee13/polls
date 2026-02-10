import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAdmin, isAdminEnvConfigured } from '../lib/admin'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'

type PendingSuggestion = {
  id: string
  question: string
  options: string[]
  created_at: string
  user_id: string
}

export function AdminPage() {
  const { session, isLoading } = useAuth()
  const [items, setItems] = useState<PendingSuggestion[] | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowed = useMemo(() => isAdmin(session), [session])
  const adminEnvConfigured = isAdminEnvConfigured()

  async function load() {
    setIsBusy(true)
    setError(null)
    try {
      const { data, error: e } = await supabase.functions.invoke('admin-suggestions', {
        body: { status: 'pending', limit: 50 },
      })
      if (e) throw e
      setItems((data?.items as PendingSuggestion[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (allowed) void load()
  }, [allowed])

  if (isLoading) return <div className="h-10 w-40 animate-pulse rounded bg-white/10" />

  if (!adminEnvConfigured) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6">
        <div className="text-lg font-semibold text-amber-200">Admin is not configured.</div>
        <div className="mt-2 text-sm text-amber-100/90">
          Set <code>VITE_ADMIN_EMAIL</code> (or numbered variants) in your environment to enable admin UI access.
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Sign in required.</div>
        <div className="mt-3">
          <Link
            to="/auth"
            className="inline-flex rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Not authorized.</div>
        <div className="mt-2 text-sm text-slate-300">
          You’re signed in as <span className="text-slate-100">{session.user.email}</span>.
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-slate-300">Review poll suggestions.</p>
          </div>
          <button
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
            disabled={isBusy}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      {items === null ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          No pending suggestions.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  {new Date(s.created_at).toLocaleString()} · {s.user_id}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true)
                      setError(null)
                      try {
                        const { error: e } = await supabase.functions.invoke('review-suggestion', {
                          body: { suggestionId: s.id, decision: 'approve' },
                        })
                        if (e) throw e
                        await load()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : String(err))
                      } finally {
                        setIsBusy(false)
                      }
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
                    disabled={isBusy}
                    onClick={async () => {
                      const reason = window.prompt('Optional: reason for rejection?', '') ?? ''
                      setIsBusy(true)
                      setError(null)
                      try {
                        const { error: e } = await supabase.functions.invoke('review-suggestion', {
                          body: {
                            suggestionId: s.id,
                            decision: 'reject',
                            reason: reason.trim() || null,
                          },
                        })
                        if (e) throw e
                        await load()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : String(err))
                      } finally {
                        setIsBusy(false)
                      }
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xl font-semibold tracking-tight">{s.question}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                {s.options.map((o, idx) => (
                  <span key={idx} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
