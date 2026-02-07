import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HCaptcha } from '../components/HCaptcha'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'

export function AuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 8, [email, password])
  const captchaRequired = Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY)

  if (session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">You’re signed in.</div>
        <div className="mt-4">
          <button
            className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
            onClick={() => navigate('/')}
          >
            Go to today’s poll
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/20 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === 'signIn' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="mt-1 text-sm text-slate-300">
        Vote once per day. Email+password or Google.
      </p>
      <p className="mt-2 text-xs text-slate-400">
        By continuing, you agree to our{' '}
        <a className="underline hover:no-underline" href="/terms">
          Terms
        </a>{' '}
        and acknowledge our{' '}
        <a className="underline hover:no-underline" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>

      <div className="mt-6 grid gap-3">
        <button
          className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/15"
          onClick={async () => {
            setIsBusy(true)
            setMessage(null)
            if (captchaRequired && !captchaToken) {
              setIsBusy(false)
              setMessage('Please complete the captcha.')
              return
            }
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: window.location.origin },
            })
            if (error) setMessage(error.message)
            if (!error) setCaptchaToken(null)
            setIsBusy(false)
          }}
          disabled={isBusy || (captchaRequired && !captchaToken)}
        >
          Continue with Google
        </button>

        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-xs text-slate-400">or</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {import.meta.env.VITE_HCAPTCHA_SITE_KEY ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold">Human check</div>
            <div className="mt-2">
              <HCaptcha
                siteKey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                onToken={(t) => setCaptchaToken(t)}
              />
            </div>
          </div>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-300">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none ring-indigo-500/40 focus:ring-2"
            placeholder="At least 8 characters"
            type="password"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          />
        </label>

        <button
          className="mt-2 rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit || isBusy || (captchaRequired && !captchaToken)}
          onClick={async () => {
            setIsBusy(true)
            setMessage(null)
            try {
              if (captchaRequired && !captchaToken) {
                throw new Error('Please complete the captcha.')
              }
              if (mode === 'signIn') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
              } else {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                setMessage('Check your email to confirm your account (if confirmations are enabled).')
              }
              setCaptchaToken(null)
              navigate('/')
            } catch (e) {
              setMessage(e instanceof Error ? e.message : String(e))
            } finally {
              setIsBusy(false)
            }
          }}
        >
          {mode === 'signIn' ? 'Sign in' : 'Sign up'}
        </button>

        <button
          className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          onClick={() => {
            setMessage(null)
            setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
          }}
          disabled={isBusy}
        >
          {mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>

        {message ? (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  )
}
