import type { Factor } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProfileRow } from '../lib/profile'
import { getMyProfile, upsertMyProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

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
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUploadUrl, setAvatarUploadUrl] = useState<string | null>(null)
  const [isPublicProfile, setIsPublicProfile] = useState(true)
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

  const avatarPreviewUrl = useMemo(() => {
    if (avatarUploadUrl) return avatarUploadUrl
    const fromInput = avatarUrl.trim()
    return fromInput || '/logo.svg'
  }, [avatarUploadUrl, avatarUrl])

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
        setBio(p?.bio ?? '')
        setAvatarUrl(
          p?.avatar_url ??
            (session.user.user_metadata?.avatar_url as string) ??
            (session.user.user_metadata?.picture as string) ??
            '',
        )
        setIsPublicProfile(p?.is_public ?? true)
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

  if (isLoading) return <div className="w-40 h-10 rounded animate-pulse bg-white/10" />

  if (!session) {
    return (
      <div className="p-6 border rounded-2xl border-white/10 bg-black/20">
        <div className="text-lg font-semibold">Sign in required.</div>
        <div className="mt-3">
          <Link
            to="/auth"
            className="inline-flex px-4 py-2 font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="p-6 border rounded-2xl border-white/10 bg-black/20">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-300">Update your public profile and security.</p>

        <div className="grid gap-3 mt-6">
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
              placeholder="Your name"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Username (public URL)</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
              placeholder="e.g. cereal_soup_enjoyer"
            />
            <div className="text-xs text-slate-400">
              Saved as:{' '}
              <span className="text-slate-200">{sanitizeUsername(username) || '(empty)'}</span>
            </div>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2 resize-none"
              placeholder="Tell us about yourself"
              rows={3}
            />
            <div className="text-xs text-slate-400">Max 256 characters.</div>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-300">Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
              placeholder="https://…"
            />
            <div className="text-xs text-slate-400">
              Or upload an image (max 5 MB).
            </div>
          </label>

          <label className="flex items-start justify-between gap-4 p-4 border rounded-2xl border-white/10 bg-black/20">
            <div>
              <div className="text-sm font-semibold">Public profile</div>
              <div className="mt-1 text-sm text-slate-300">
                When off, your profile page and vote history are hidden from everyone else.
              </div>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-indigo-500"
              checked={isPublicProfile}
              onChange={(e) => setIsPublicProfile(e.target.checked)}
            />
          </label>

          <div className="grid gap-2 p-4 border rounded-2xl border-white/10 bg-black/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Upload profile picture</div>
              <img
                src={avatarPreviewUrl}
                alt=""
                className="object-cover w-10 h-10 border rounded-xl border-white/10 bg-black/30"
                referrerPolicy="no-referrer"
              />
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setAvatarUploadUrl(null)
                setAvatarFile(f)
              }}
              className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
            />

            <div className="flex flex-wrap gap-2">
              <button
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isBusy ||
                  !avatarFile ||
                  avatarFile.size > MAX_AVATAR_BYTES ||
                  !avatarFile.type.startsWith('image/')
                }
                onClick={async () => {
                  if (!avatarFile) return
                  setIsBusy(true)
                  setMessage(null)
                  try {
                    if (avatarFile.size > MAX_AVATAR_BYTES) {
                      throw new Error('File is larger than 5 MB.')
                    }
                    if (!avatarFile.type.startsWith('image/')) {
                      throw new Error('File must be an image.')
                    }

                    const extFromName = avatarFile.name.split('.').pop()?.toLowerCase() ?? ''
                    const ext =
                      extFromName && extFromName.length <= 6
                        ? extFromName
                        : avatarFile.type.split('/').pop() ?? 'png'

                    const path = `avatars/${session.user.id}/${Date.now()}.${ext}`

                    const upload = await supabase.storage
                      .from('profile-pictures')
                      .upload(path, avatarFile, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: avatarFile.type,
                      })

                    if (upload.error) throw upload.error

                    const pub = supabase.storage.from('profile-pictures').getPublicUrl(path)
                    const publicUrl = pub.data.publicUrl

                    setAvatarUploadUrl(publicUrl)
                    setAvatarUrl(publicUrl)
                    setMessage('Uploaded. Don’t forget to hit Save.')
                  } catch (e) {
                    setMessage(
                      e instanceof Error
                        ? e.message
                        : 'Upload failed. Make sure the bucket has policies that allow upload + read.',
                    )
                  } finally {
                    setIsBusy(false)
                  }
                }}
              >
                Upload
              </button>

              <button
                className="px-4 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  setAvatarFile(null)
                  setAvatarUploadUrl(null)
                }}
              >
                Clear upload
              </button>

              {avatarFile && avatarFile.size > MAX_AVATAR_BYTES ? (
                <div className="self-center text-sm text-amber-200">Max size is 5 MB.</div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSave || isBusy}
              onClick={async () => {
                setIsBusy(true)
                setMessage(null)
                try {
                  const nextUsername = sanitizeUsername(username)
                  await upsertMyProfile({
                    id: session.user.id,
                    username: nextUsername || null,
                    display_name: displayName.trim(),
                    bio: bio.trim().slice(0, 256) || null,
                    avatar_url: avatarUrl.trim() || null,
                    is_public: isPublicProfile,
                    updated_at: new Date().toISOString(),
                  })
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
                className="px-4 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15"
              >
                View profile
              </Link>
            ) : null}
          </div>

          {message ? (
            <div className="px-3 py-2 text-sm border rounded-xl border-white/10 bg-black/30 text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-6 border rounded-2xl border-white/10 bg-black/20">
        <div className="text-lg font-semibold">Password</div>
        <div className="mt-1 text-sm text-slate-300">
          Set or change your password (minimum 8 characters).
        </div>

        <div className="grid gap-3 mt-6">
          <label className="grid gap-1">
            <span className="text-sm text-slate-300">New password</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
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
              className="px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
              placeholder="Repeat password"
              type="password"
              autoComplete="new-password"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="px-4 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60"
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
            <div className="px-3 py-2 text-sm border rounded-xl border-white/10 bg-black/30 text-slate-200">
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-6 border rounded-2xl border-white/10 bg-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Two-factor auth (2FA)</div>
            <div className="text-sm text-slate-300">TOTP via an authenticator app.</div>
          </div>
          <button
            className="px-3 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60"
            disabled={isBusy}
            onClick={() =>
              void refreshFactors().catch((e) => setMessage(e instanceof Error ? e.message : String(e)))
            }
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-3 mt-4">
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
              className="px-4 py-2 text-sm font-semibold text-white w-fit rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60"
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
                  className="p-3 bg-white border w-fit rounded-xl border-white/10"
                  dangerouslySetInnerHTML={{ __html: enrollSvg }}
                />
              ) : null}
              <label className="grid gap-1">
                <span className="text-sm text-slate-300">Verification code</span>
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="w-48 px-3 py-2 border outline-none rounded-xl border-white/10 bg-black/30 ring-indigo-500/40 focus:ring-2"
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-400 disabled:opacity-60"
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
                  className="px-4 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60"
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
