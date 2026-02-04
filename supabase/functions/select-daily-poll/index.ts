// Supabase Edge Function (deploy to the *active* project).
// Picks a poll from the bank project and inserts today's row into daily_polls (UTC date).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type BankPoll = {
  id: string
  question: string
  options: unknown
}

function utcDateId(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  if (!bankUrl || !bankServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing BANK_SUPABASE_URL / BANK_SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    )
  }

  const active = createClient(activeUrl, activeServiceRoleKey)
  const bank = createClient(bankUrl, bankServiceRoleKey)

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
    .select('id,question,options')
    .eq('is_active', true)
    .is('used_at', null)
    .order('created_at', { ascending: true })
    .limit(200)

  if (pick.error) {
    return new Response(JSON.stringify({ error: pick.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const rows = (pick.data ?? []) as BankPoll[]
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
    source_project: 'bank',
    source_poll_id: chosen.id,
  })

  if (insertRes.error) {
    return new Response(JSON.stringify({ error: insertRes.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
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
