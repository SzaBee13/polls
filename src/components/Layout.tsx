import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isAdmin } from '../lib/admin'
import { useAuth } from '../state/auth'

export function Layout() {
  const { session, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const admin = isAdmin(session)

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-indigo-950/20">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span>Polls That Shouldn’t Exist</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/suggest" className="rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
              Suggest
            </Link>
            {admin ? (
              <Link to="/admin" className="rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                Admin
              </Link>
            ) : null}
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-lg bg-white/10" />
            ) : session ? (
              <>
                <span className="hidden text-sm text-slate-300 sm:inline">
                  {session.user.email ?? session.user.user_metadata?.full_name ?? 'Signed in'}
                </span>
                <button
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                  onClick={async () => {
                    await signOut()
                    if (location.pathname !== '/') navigate('/')
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-slate-400">
        Resets at midnight UTC. One vote per account, per poll.
      </footer>
    </div>
  )
}
