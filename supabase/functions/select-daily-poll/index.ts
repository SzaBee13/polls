// Supabase Edge Function (deploy to the *active* project).
// Picks a poll from the poll_bank table and inserts today's row into daily_polls (UTC date).

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

function isMissingColumn(message: string): boolean {
  return /column .* does not exist/i.test(message)
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const activeUrl = Deno.env.get('SUPABASE_URL')!
  const activeServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const active = createClient(activeUrl, activeServiceRoleKey)

  const today = utcDateId()

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
  if (pickError && isactive
    .from('poll_bank')
    .select('id,question,options,created_by_user_id,created_by_username,created_by_display_name')
    .eq('is_active', true)
    .is('used_at', null)
    .order('created_at', { ascending: true })
    .limit(200)

  let pickData = pick.data
  let pickError = pick.error
  if (pickError && isMissingColumn(pickError.message)) {
    const fallbackPick = await active
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
        source_project: 'active',
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

  const markUsed = await active
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

