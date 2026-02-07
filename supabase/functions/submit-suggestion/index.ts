// Supabase Edge Function (deploy to the *active* project).
// Inserts a poll suggestion after optional hCaptcha verification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Body = {
  question: string
  options: unknown
  captchaToken?: string | null
}

function normalizeOptions(input: unknown[]): string[] {
  const cleaned = input.map((o) => String(o).trim()).filter(Boolean)
  const deduped: string[] = []
  for (const opt of cleaned) {
    if (!deduped.some((x) => x.toLowerCase() === opt.toLowerCase())) deduped.push(opt)
  }
  return deduped
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const activeUrl = Deno.env.get('SUPABASE_URL')!
  const activeServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET') ?? null

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const question = (body.question ?? '').trim()
  const optionsRaw = Array.isArray(body.options) ? (body.options as unknown[]) : null
  if (question.length < 8) {
    return new Response(JSON.stringify({ error: 'Question is too short.' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
  if (!optionsRaw || optionsRaw.length < 2 || optionsRaw.length > 8) {
    return new Response(JSON.stringify({ error: 'Options must be an array of 2–8 items.' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const normalizedOptions = normalizeOptions(optionsRaw)
  if (normalizedOptions.length < 2) {
    return new Response(JSON.stringify({ error: 'Options must contain at least 2 non-empty items.' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (hcaptchaSecret) {
    const captchaToken = (body.captchaToken ?? '').toString().trim()
    if (!captchaToken) {
      return new Response(JSON.stringify({ error: 'Captcha required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const form = new URLSearchParams()
    form.set('secret', hcaptchaSecret)
    form.set('response', captchaToken)

    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
      success?: boolean
      ['error-codes']?: unknown
    }
    if (!verifyJson.success) {
      return new Response(
        JSON.stringify({ error: 'Captcha failed.', details: verifyJson['error-codes'] ?? null }),
        { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } },
      )
    }
  }

  const active = createClient(activeUrl, activeServiceRoleKey)
  const userRes = await active.auth.getUser(token)
  const userId = userRes.data.user?.id ?? null
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const insert = await active.from('poll_suggestions').insert({
    user_id: userId,
    question,
    options: normalizedOptions,
  })

  if (insert.error) {
    return new Response(JSON.stringify({ error: insert.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})

