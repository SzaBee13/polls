import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isAdmin } from '../lib/admin'
import { getMyProfile } from '../lib/profile'
import { useAuth } from '../state/auth'

export function Layout() {
  const { session, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const admin = isAdmin(session)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)

  const fallbackAvatar = useMemo(() => {
    const pic = session?.user?.user_metadata?.avatar_url ?? session?.user?.user_metadata?.picture
    return typeof pic === 'string' ? pic : null
  }, [session])

  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      if (!session) {
        setMyUsername(null)
        setMyAvatar(null)
        return
      }
      try {
        const p = await getMyProfile(session.user.id)
        if (!mounted) return
        setMyUsername(p?.username ?? null)
        setMyAvatar(p?.avatar_url ?? null)
      } catch {
        // ignore
      }
    }
    void loadProfile()
    return () => {
      mounted = false
    }
  }, [session])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpen) return
      if (!menuRef.current) return
      if (e.target instanceof Node && menuRef.current.contains(e.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

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
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-lg bg-white/10" />
            ) : session ? (
              <>
                <div className="relative" ref={menuRef}>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 hover:bg-black/40"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <img
                      src={myAvatar ?? fallbackAvatar ?? '/logo.svg'}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-xl backdrop-blur">
                      <div className="border-b border-white/10 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-100">
                          {session.user.user_metadata?.full_name ?? session.user.email ?? 'Signed in'}
                        </div>
                        <div className="text-xs text-slate-400">{session.user.email}</div>
                      </div>

                      <div className="p-2">
                        <Link
                          to="/settings"
                          className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                          onClick={() => setMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <Link
                          to={myUsername ? `/u/${myUsername}` : '/settings'}
                          className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                          onClick={() => setMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        {admin ? (
                          <Link
                            to="/admin"
                            className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                            onClick={() => setMenuOpen(false)}
                          >
                            Admin
                          </Link>
                        ) : null}
                        <button
                          className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                          onClick={async () => {
                            setMenuOpen(false)
                            await signOut()
                            if (location.pathname !== '/') navigate('/')
                          }}
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Resets at midnight UTC. One vote per account, per poll.</span>
          <span className="text-white/20">·</span>
          <Link className="hover:underline" to="/privacy">
            Privacy
          </Link>
          <span className="text-white/20">·</span>
          <Link className="hover:underline" to="/terms">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
