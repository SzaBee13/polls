import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'

type PollSuggestionRow = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  question: string
  options: string[]
  created_at: string
  decision_reason: string | null
}

function normalizeOptions(lines: string[]): string[] {
  const cleaned = lines.map((l) => l.trim()).filter(Boolean)
  const deduped: string[] = []
  for (const opt of cleaned) {
    if (!deduped.some((x) => x.toLowerCase() === opt.toLowerCase())) deduped.push(opt)
  }
  return deduped
}

export function SuggestPage() {
  const { session, isLoading } = useAuth()
  const [question, setQuestion] = useState('')
  const [optionText, setOptionText] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mySuggestions, setMySuggestions] = useState<PollSuggestionRow[] | null>(null)

  const options = useMemo(() => normalizeOptions(optionText.split('\n')), [optionText])
  const canSubmit = useMemo(
    () => question.trim().length >= 8 && options.length >= 2 && options.length <= 8,
    [question, options.length],
  )

  async function loadMine() {
    if (!session) return
    const { data, error: e } = await supabase
      .from('poll_suggestions')
      .select('id,status,question,options,created_at,decision_reason')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (e) {
      setError(e.message)
      return
    }
    setMySuggestions((data as PollSuggestionRow[]) ?? [])
  }

  if (isLoading) {
    return <div className="h-10 w-40 animate-pulse rounded bg-white/10" />
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Sign in to suggest a poll.</div>
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

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Suggest a poll</h1>
        <p className="mt-1 text-sm text-slate-300">
          Keep it weird. If approved, it gets added to the poll bank.
        </p>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Question</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="e.g. Would you survive 1400s Europe?"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Options (one per line)</span>
            <textarea
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
              className="min-h-32 resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder={'Yes\nNo\nIt depends (dramatic)'}
            />
            <div className="text-xs text-slate-400">
              {options.length} option(s). Minimum 2, maximum 8.
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit || isBusy}
              onClick={async () => {
                setIsBusy(true)
                setError(null)
                setSuccess(null)
                try {
                  const { error: e } = await supabase.from('poll_suggestions').insert({
                    user_id: session.user.id,
                    question: question.trim(),
                    options,
                  })
                  if (e) throw e
                  setQuestion('')
                  setOptionText('')
                  setSuccess('Submitted! Thanks for making the internet worse.')
                  await loadMine()
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err))
                } finally {
                  setIsBusy(false)
                }
              }}
            >
              Submit suggestion
            </button>

            <button
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={() => void loadMine()}
              disabled={isBusy}
            >
              Refresh my submissions
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100">
              {success}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">My submissions</div>
            <div className="text-sm text-slate-300">Last 20 suggestions.</div>
          </div>
          <button
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => void loadMine()}
          >
            Load
          </button>
        </div>

        {mySuggestions === null ? (
          <div className="mt-4 text-sm text-slate-400">Not loaded yet.</div>
        ) : mySuggestions.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">No submissions yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {mySuggestions.map((s) => (
              <div key={s.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{s.status.toUpperCase()}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 font-medium">{s.question}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  {s.options.map((o, idx) => (
                    <span key={idx} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      {o}
                    </span>
                  ))}
                </div>
                {s.decision_reason ? (
                  <div className="mt-3 text-sm text-slate-300">
                    Note: <span className="text-slate-200">{s.decision_reason}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
