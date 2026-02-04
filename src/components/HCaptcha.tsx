import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => number
      reset: (widgetId?: number) => void
    }
  }
}

type Props = {
  siteKey: string
  onToken: (token: string | null) => void
}

function loadHcaptchaScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.hcaptcha) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>('script[data-hcaptcha]')
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => resolve(), { once: true })
    })
  }

  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.hcaptcha = 'true'
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
}

export function HCaptcha(props: Props) {
  const { siteKey, onToken } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      await loadHcaptchaScript()
      if (!mounted) return
      if (!containerRef.current) return
      if (!window.hcaptcha) return
      if (widgetIdRef.current !== null) return

      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: unknown) => onToken(typeof token === 'string' ? token : null),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })

      setIsReady(true)
    }

    void init()
    return () => {
      mounted = false
    }
  }, [siteKey, onToken])

  return (
    <div className="grid gap-2">
      <div ref={containerRef} />
      {!isReady ? <div className="text-xs text-slate-400">Loading captcha…</div> : null}
    </div>
  )
}
