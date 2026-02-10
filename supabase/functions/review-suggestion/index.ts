// Supabase Edge Function (deploy to the *active* project).
// Admin action to approve/reject a poll suggestion.
// Approve -> insert into bank project's poll_bank and mark suggestion approved.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Body = {
  suggestionId: string
  decision: 'approve' | 'reject'
  reason?: string | null
}

function isMissingColumn(message: string): boolean {
  return /column .* does not exist/i.test(message)
}

function getAdminEmailsFromEnv(): string[] {
  const candidates = [
    Deno.env.get('ADMIN_EMAIL'),
    Deno.env.get('ADMIN_EMAIL_2'),
    Deno.env.get('ADMIN_EMAIL_3'),
    Deno.env.get('ADMIN_EMAIL_4'),
    Deno.env.get('ADMIN_EMAIL_5'),
    Deno.env.get('ADMIN_EMAIL_6'),
    Deno.env.get('ADMIN_EMAIL_7'),
    Deno.env.get('ADMIN_EMAIL_8'),
    Deno.env.get('ADMIN_EMAIL_9'),
    Deno.env.get('ADMIN_EMAIL_10'),
  ]

  const list = candidates
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean)

  return list
}

async function requireAdmin(
  active: ReturnType<typeof createClient>,
  req: Request,
  adminEmails: string[],
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return { ok: false, status: 401, error: 'Missing Authorization bearer token' }

  const userRes = await active.auth.getUser(token)
  if (userRes.error) return { ok: false, status: 401, error: `Invalid session: ${userRes.error.message}` }

  const user = userRes.data.user
  const email = (user?.email ?? '').toLowerCase()
  if (!email || !adminEmails.includes(email)) return { ok: false, status: 403, error: 'Not authorized' }

  return { ok: true, userId: user!.id }
}


async function updateSuggestionApproved(
  active: ReturnType<typeof createClient>,
  suggestionId: string,
  bankPollId: string | null,
  userId: string,
) {
  return active
    .from('poll_suggestions')
    .update({
      status: 'approved',
      bank_poll_id: bankPollId,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_reason: null,
    })
    .eq('id', suggestionId)
    .eq('status', 'pending')
    .select('id,status,question,options,created_at,decision_reason,bank_poll_id')
    .maybeSingle()
}

async function rollbackBankPoll(
  bank: ReturnType<typeof createClient>,
  bankPollId: string,
): Promise<string | null> {
  const rollback = await bank.from('poll_bank').delete().eq('id', bankPollId)
  if (rollback.error) return rollback.error.message
  return null
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const activeUrl = Deno.env.get('SUPABASE_URL')!
  const activeServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const bankUrl = Deno.env.get('BANK_SUPABASE_URL')
  const bankServiceRoleKey = Deno.env.get('BANK_SUPABASE_SERVICE_ROLE_KEY')
  if (!bankUrl || !bankServiceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing BANK_SUPABASE_URL / BANK_SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
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

  if (!body.suggestionId || (body.decision !== 'approve' && body.decision !== 'reject')) {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const active = createClient(activeUrl, activeServiceRoleKey)
  const bank = createClient(bankUrl, bankServiceRoleKey)
  const adminEmails = getAdminEmailsFromEnv()
  if (adminEmails.length === 0) {
    return new Response(JSON.stringify({ error: 'Admin emails are not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const authz = await requireAdmin(active, req, adminEmails)
  if (!authz.ok) {
    return new Response(JSON.stringify({ error: authz.error }), {
      status: authz.status,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const suggestionRes = await active
    .from('poll_suggestions')
    .select('id,status,question,options,user_id')
    .eq('id', body.suggestionId)
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

  if (body.decision === 'reject') {
    const upd = await active
      .from('poll_suggestions')
      .update({
        status: 'rejected',
        decided_by: authz.userId,
        decided_at: new Date().toISOString(),
        decision_reason: (body.reason ?? null) || null,
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

      const insertedBankPollId = fallbackInsert.data?.id ?? null
      const upd = await updateSuggestionApproved(active, suggestion.id, insertedBankPollId, authz.userId)

      if (upd.error || !upd.data) {
        const rollbackMessage = insertedBankPollId ? await rollbackBankPoll(bank, insertedBankPollId) : null
        const details = rollbackMessage
          ? `; rollback failed: ${rollbackMessage}`
          : '; inserted bank poll was rolled back'
        return new Response(
          JSON.stringify({
            error: `Failed to mark suggestion approved after inserting bank poll${details}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'content-type': 'application/json' },
          },
        )
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

  const insertedBankPollId = insert.data?.id ?? null
  const upd = await updateSuggestionApproved(active, suggestion.id, insertedBankPollId, authz.userId)

  if (upd.error || !upd.data) {
    const rollbackMessage = insertedBankPollId ? await rollbackBankPoll(bank, insertedBankPollId) : null
    const details = rollbackMessage
      ? `; rollback failed: ${rollbackMessage}`
      : '; inserted bank poll was rolled back'
    return new Response(
      JSON.stringify({
        error: `Failed to mark suggestion approved after inserting bank poll${details}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify({ ok: true, suggestion: upd.data }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})

