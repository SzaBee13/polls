import type { Factor } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProfileRow } from '../lib/profile'
import { getMyProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'

function sanitizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 24)
}

export function SettingsPage() {
  const { session, isLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [factors, setFactors] = useState<Factor[] | null>(null)
  const [enrollSvg, setEnrollSvg] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')

  const canSave = useMemo(
    () =>
      displayName.trim().length >= 2 &&
      (username.trim().length === 0 || sanitizeUsername(username).length >= 3),
    [displayName, username],
  )

  const canChangePassword = useMemo(() => {
    const p1 = newPassword.trim()
    const p2 = confirmPassword.trim()
    if (!p1 || !p2) return false
    if (p1 !== p2) return false
    if (p1.length < 8) return false
    return true
  }, [newPassword, confirmPassword])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!session) return
      try {
        const p = await getMyProfile(session.user.id)
        if (!mounted) return
        setProfile(p)
        setUsername(p?.username ?? '')
        setDisplayName(
          p?.display_name ?? (session.user.user_metadata?.full_name as string) ?? 'Anonymous',
        )
        setAvatarUrl(
          p?.avatar_url ??
            (session.user.user_metadata?.avatar_url as string) ??
            (session.user.user_metadata?.picture as string) ??
            '',
        )
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e))
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [session])

  async function refreshFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    setFactors([...(data?.all ?? [])])
  }

  useEffect(() => {
    if (!session) return
    void refreshFactors().catch((e) => setMessage(e instanceof Error ? e.message : String(e)))
  }, [session])

  if (isLoading) return <div className="h-10 w-40 animate-pulse rounded bg-white/10" />

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

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-300">Update your public profile and security.</p>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="Your name"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Username (public URL)</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="e.g. cereal_soup_enjoyer"
            />
            <div className="text-xs text-slate-400">
              Saved as:{' '}
              <span className="text-slate-200">{sanitizeUsername(username) || '(empty)'}</span>
            </div>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="https://…"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSave || isBusy}
              onClick={async () => {
                setIsBusy(true)
                setMessage(null)
                try {
                  const nextUsername = sanitizeUsername(username)
                  const { error } = await supabase.from('profiles').upsert({
                    id: session.user.id,
                    username: nextUsername || null,
                    display_name: displayName.trim(),
                    avatar_url: avatarUrl.trim() || null,
                    updated_at: new Date().toISOString(),
                  })
                  if (error) throw error
                  const next = await getMyProfile(session.user.id)
                  setProfile(next)
                  setMessage('Saved.')
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e))
                } finally {
                  setIsBusy(false)
                }
              }}
            >
              Save
            </button>

            {profile?.username ? (
              <Link
                to={`/u/${profile.username}`}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                View profile
              </Link>
            ) : null}
          </div>

          {message ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Password</div>
        <div className="mt-1 text-sm text-slate-300">
          Set or change your password (minimum 8 characters).
        </div>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">New password</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="At least 8 characters"
              type="password"
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Confirm new password</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
              placeholder="Repeat password"
              type="password"
              autoComplete="new-password"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canChangePassword || isBusy}
              onClick={async () => {
                setIsBusy(true)
                setMessage(null)
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword.trim() })
                  if (error) throw error
                  setNewPassword('')
                  setConfirmPassword('')
                  setMessage('Password updated.')
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e))
                } finally {
                  setIsBusy(false)
                }
              }}
            >
              Change password
            </button>

            <button
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
              disabled={isBusy}
              onClick={() => {
                setNewPassword('')
                setConfirmPassword('')
                setMessage(null)
              }}
            >
              Clear
            </button>
          </div>

          {newPassword.trim() && confirmPassword.trim() && newPassword.trim() !== confirmPassword.trim() ? (
            <div className="text-sm text-amber-200">Passwords don’t match.</div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Two-factor auth (2FA)</div>
            <div className="text-sm text-slate-300">TOTP via an authenticator app.</div>
          </div>
          <button
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
            disabled={isBusy}
            onClick={() =>
              void refreshFactors().catch((e) => setMessage(e instanceof Error ? e.message : String(e)))
            }
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {factors === null ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : factors.length === 0 ? (
            <div className="text-sm text-slate-400">No factors enrolled.</div>
          ) : (
            <div className="text-sm text-slate-300">
              Enrolled factors:{' '}
              <span className="text-slate-100">{factors.map((f) => f.factor_type).join(', ')}</span>
            </div>
          )}

          {!enrollFactorId ? (
            <button
              className="w-fit rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true)
                setMessage(null)
                setEnrollSvg(null)
                setEnrollFactorId(null)
                try {
                  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
                  if (error) throw error
                  setEnrollFactorId(data.id)
                  setEnrollSvg(data.totp.qr_code)
                  setMessage('Scan the QR, then enter the 6-digit code to verify.')
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e))
                } finally {
                  setIsBusy(false)
                }
              }}
            >
              Enable 2FA (TOTP)
            </button>
          ) : (
            <div className="grid gap-3">
              {enrollSvg ? (
                <div
                  className="w-fit rounded-xl border border-white/10 bg-white p-3"
                  dangerouslySetInnerHTML={{ __html: enrollSvg }}
                />
              ) : null}
              <label className="grid gap-1">
                <span className="text-sm text-slate-300">Verification code</span>
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="w-48 rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                  disabled={isBusy || verifyCode.trim().length < 6}
                  onClick={async () => {
                    setIsBusy(true)
                    setMessage(null)
                    try {
                      const { data, error } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId })
                      if (error) throw error
                      const verify = await supabase.auth.mfa.verify({
                        factorId: enrollFactorId,
                        challengeId: data.id,
                        code: verifyCode.trim(),
                      })
                      if (verify.error) throw verify.error
                      setEnrollFactorId(null)
                      setEnrollSvg(null)
                      setVerifyCode('')
                      await refreshFactors()
                      setMessage('2FA enabled.')
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e))
                    } finally {
                      setIsBusy(false)
                    }
                  }}
                >
                  Verify
                </button>
                <button
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => {
                    setEnrollFactorId(null)
                    setEnrollSvg(null)
                    setVerifyCode('')
                    setMessage(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
