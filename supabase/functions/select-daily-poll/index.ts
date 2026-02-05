// Supabase Edge Function (deploy to the *active* project).
// Picks a poll from the bank project and inserts today's row into daily_polls (UTC date).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type BankPoll = {
  id: string
  question: string
  options: unknown
  created_by_user_id?: string | null
  created_by_username?: string | null
  created_by_display_name?: string | null
}

function utcDateId(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type AdminListBody = {
  action: 'adminListSuggestions'
  status?: 'pending' | 'approved' | 'rejected'
  limit?: number
}

type ReviewSuggestionBody = {
  action: 'reviewSuggestion'
  suggestionId: string
  decision: 'approve' | 'reject'
  reason?: string | null
}

type SubmitSuggestionBody = {
  action: 'submitSuggestion'
  question: string
  options: unknown
  captchaToken?: string | null
}

type ActionBody =
  | AdminListBody
  | ReviewSuggestionBody
  | SubmitSuggestionBody
  | { action?: 'selectDaily' }
  | Record<string, unknown>

function isMissingColumn(message: string): boolean {
  return /column .* does not exist/i.test(message)
}

async function requireAdminEmail(
  active: ReturnType<typeof createClient>,
  req: Request,
  adminEmail: string,
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return { ok: false, status: 401, error: 'Missing Authorization bearer token' }

  const userRes = await active.auth.getUser(token)
  const email = (userRes.data.user?.email ?? '').toLowerCase()
  if (!email || email !== adminEmail.toLowerCase()) return { ok: false, status: 403, error: 'Not authorized' }

  return { ok: true, userId: userRes.data.user!.id }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const activeUrl = Deno.env.get('SUPABASE_URL')!
  const activeServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const bankUrl = Deno.env.get('BANK_SUPABASE_URL')
  const bankServiceRoleKey = Deno.env.get('BANK_SUPABASE_SERVICE_ROLE_KEY')

  const active = createClient(activeUrl, activeServiceRoleKey)
  const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'miabajodlol@gmail.com'
  const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET') ?? null

  let body: ActionBody | null = null
  try {
    body = (await req.json()) as ActionBody
  } catch {
    body = null
  }

  const action = typeof body?.action === 'string' ? body.action : 'selectDaily'

  if (action === 'submitSuggestion') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const b = body as SubmitSuggestionBody
    const question = (b.question ?? '').trim()
    const options = Array.isArray(b.options) ? (b.options as unknown[]) : null

    if (question.length < 8) {
      return new Response(JSON.stringify({ error: 'Question is too short.' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    if (!options || options.length < 2 || options.length > 8) {
      return new Response(JSON.stringify({ error: 'Options must be an array of 2–8 items.' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const normalizedOptions = options.map((o) => String(o).trim()).filter(Boolean)
    if (normalizedOptions.length < 2) {
      return new Response(JSON.stringify({ error: 'Options must contain at least 2 non-empty items.' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Optional hCaptcha check if configured.
    if (hcaptchaSecret) {
      const captchaToken = (b.captchaToken ?? '').toString().trim()
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
      const verifyJson = (await verifyRes.json().catch(() => ({}))) as { success?: boolean; ['error-codes']?: unknown }
      if (!verifyJson.success) {
        return new Response(JSON.stringify({ error: 'Captcha failed.', details: verifyJson['error-codes'] ?? null }), {
          status: 400,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }
    }

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
  }

  if (action === 'adminListSuggestions') {
    const authz = await requireAdminEmail(active, req, adminEmail)
    if (!authz.ok) {
      return new Response(JSON.stringify({ error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const status = (body as AdminListBody).status ?? 'pending'
    const limit = Math.min(200, Math.max(1, (body as AdminListBody).limit ?? 50))

    const list = await active
      .from('poll_suggestions')
      .select('id,question,options,created_at,user_id')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (list.error) {
      return new Response(JSON.stringify({ error: list.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const items = (list.data ?? []).map((r) => ({
      id: r.id,
      question: r.question,
      options: r.options,
      created_at: r.created_at,
      user_id: r.user_id,
    }))

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (action === 'reviewSuggestion') {
    if (!bankUrl || !bankServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing BANK_SUPABASE_URL / BANK_SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } },
      )
    }
    const bank = createClient(bankUrl, bankServiceRoleKey)

    const authz = await requireAdminEmail(active, req, adminEmail)
    if (!authz.ok) {
      return new Response(JSON.stringify({ error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const b = body as ReviewSuggestionBody
    if (!b.suggestionId || (b.decision !== 'approve' && b.decision !== 'reject')) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const suggestionRes = await active
      .from('poll_suggestions')
      .select('id,status,question,options,user_id')
      .eq('id', b.suggestionId)
      .maybeSingle()

    if (suggestionRes.error) {
      return new Response(JSON.stringify({ error: suggestionRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    const suggestion = suggestionRes.data as
      | { id: string; status: string; question: string; options: unknown; user_id: string }
      | null
    if (!suggestion) {
      return new Response(JSON.stringify({ error: 'Suggestion not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    if (suggestion.status === 'approved' || suggestion.status === 'rejected') {
      return new Response(JSON.stringify({ ok: true, alreadyDecided: true, suggestion }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    if (b.decision === 'reject') {
      const upd = await active
        .from('poll_suggestions')
        .update({
          status: 'rejected',
          decided_by: authz.userId,
          decided_at: new Date().toISOString(),
          decision_reason: (b.reason ?? null) || null,
        })
        .eq('id', suggestion.id)
        .select('id,status,question,options,created_at,decision_reason,bank_poll_id')
        .maybeSingle()

      if (upd.error) {
        return new Response(JSON.stringify({ error: upd.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, suggestion: upd.data }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const profileRes = await active
      .from('profiles')
      .select('display_name,username,is_public')
      .eq('id', suggestion.user_id)
      .maybeSingle()

    const profileData = profileRes.data as
      | { display_name?: string | null; username?: string | null; is_public?: boolean | null }
      | null

    const isPublic = profileData?.is_public ?? true
    const createdByUsername = isPublic ? profileData?.username ?? null : null
    const createdByDisplayName = isPublic
      ? profileData?.display_name ?? profileData?.username ?? null
      : null

    const insert = await bank
      .from('poll_bank')
      .insert({
        question: suggestion.question,
        options: suggestion.options,
        created_by_user_id: suggestion.user_id,
        created_by_username: createdByUsername,
        created_by_display_name: createdByDisplayName,
        is_active: true,
        used_at: null,
      })
      .select('id')
      .maybeSingle()

    if (insert.error) {
      // Back-compat: if bank schema wasn't migrated yet, retry insert without attribution columns.
      if (isMissingColumn(insert.error.message)) {
        const fallbackInsert = await bank
          .from('poll_bank')
          .insert({
            question: suggestion.question,
            options: suggestion.options,
            is_active: true,
            used_at: null,
          })
          .select('id')
          .maybeSingle()

        if (fallbackInsert.error) {
          return new Response(JSON.stringify({ error: fallbackInsert.error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'content-type': 'application/json' },
          })
        }

        const upd = await active
          .from('poll_suggestions')
          .update({
            status: 'approved',
            bank_poll_id: fallbackInsert.data?.id ?? null,
            decided_by: authz.userId,
            decided_at: new Date().toISOString(),
            decision_reason: null,
          })
          .eq('id', suggestion.id)
          .select('id,status,question,options,created_at,decision_reason,bank_poll_id')
          .maybeSingle()

        if (upd.error) {
          return new Response(JSON.stringify({ error: upd.error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'content-type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ ok: true, suggestion: upd.data }), {
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: insert.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const upd = await active
      .from('poll_suggestions')
      .update({
        status: 'approved',
        bank_poll_id: insert.data?.id ?? null,
        decided_by: authz.userId,
        decided_at: new Date().toISOString(),
        decision_reason: null,
      })
      .eq('id', suggestion.id)
      .select('id,status,question,options,created_at,decision_reason,bank_poll_id')
      .maybeSingle()

    if (upd.error) {
      return new Response(JSON.stringify({ error: upd.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, suggestion: upd.data }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const today = utcDateId()
  if (!bankUrl || !bankServiceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing BANK_SUPABASE_URL / BANK_SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
  const bank = createClient(bankUrl, bankServiceRoleKey)

  // Idempotent: if today exists, return it.
  const existing = await active
    .from('daily_polls')
    .select('id,poll_date,question,options,source_poll_id')
    .eq('poll_date', today)
    .maybeSingle()

  if (existing.error) {
    return new Response(JSON.stringify({ error: existing.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
  if (existing.data) {
    return new Response(JSON.stringify({ ok: true, alreadyExisted: true, poll: existing.data }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Pick a random unused poll.
  const pick = await bank
    .from('poll_bank')
    .select('id,question,options,created_by_user_id,created_by_username,created_by_display_name')
    .eq('is_active', true)
    .is('used_at', null)
    .order('created_at', { ascending: true })
    .limit(200)

  let pickData = pick.data
  let pickError = pick.error
  if (pickError && isMissingColumn(pickError.message)) {
    const fallbackPick = await bank
      .from('poll_bank')
      .select('id,question,options')
      .eq('is_active', true)
      .is('used_at', null)
      .order('created_at', { ascending: true })
      .limit(200)
    pickData = fallbackPick.data
    pickError = fallbackPick.error
  }

  if (pickError) {
    return new Response(JSON.stringify({ error: pickError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const rows = (pickData ?? []) as BankPoll[]
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No unused polls in poll_bank' }), {
      status: 409,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const chosen = rows[Math.floor(Math.random() * rows.length)]

  const insertRes = await active.from('daily_polls').insert({
    poll_date: today,
    question: chosen.question,
    options: chosen.options,
    created_by_user_id: chosen.created_by_user_id ?? null,
    created_by_username: chosen.created_by_username ?? null,
    created_by_display_name: chosen.created_by_display_name ?? null,
    source_project: 'bank',
    source_poll_id: chosen.id,
  })

  if (insertRes.error) {
    // Back-compat: active DB might not have attribution columns yet.
    if (isMissingColumn(insertRes.error.message)) {
      const fallbackInsert = await active.from('daily_polls').insert({
        poll_date: today,
        question: chosen.question,
        options: chosen.options,
        source_project: 'bank',
        source_poll_id: chosen.id,
      })

      if (fallbackInsert.error) {
        return new Response(JSON.stringify({ error: fallbackInsert.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }
    } else {
      return new Response(JSON.stringify({ error: insertRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
  }

  const markUsed = await bank
    .from('poll_bank')
    .update({ used_at: new Date().toISOString() })
    .eq('id', chosen.id)

  if (markUsed.error) {
    // Not fatal for serving today's poll, but you probably want to notice it.
    return new Response(
      JSON.stringify({
        ok: true,
        poll: { poll_date: today, question: chosen.question, source_poll_id: chosen.id },
        warning: `Inserted daily poll but failed to mark bank poll used: ${markUsed.error.message}`,
      }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      poll: { poll_date: today, question: chosen.question, source_poll_id: chosen.id },
    }),
    { headers: { ...corsHeaders, 'content-type': 'application/json' } },
  )
})
