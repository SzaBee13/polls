// Supabase Edge Function (deploy to the *active* project).
// Lists poll suggestions for admins.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Body = {
  status?: 'pending' | 'approved' | 'rejected'
  limit?: number
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

  return list.length > 0 ? list : ['miabajodlol@gmail.com']
}

async function requireAdmin(
  active: ReturnType<typeof createClient>,
  req: Request,
  adminEmails: string[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return { ok: false, status: 401, error: 'Missing Authorization bearer token' }

  const userRes = await active.auth.getUser(token)
  const email = (userRes.data.user?.email ?? '').toLowerCase()
  if (!email || !adminEmails.includes(email)) return { ok: false, status: 403, error: 'Not authorized' }

  return { ok: true }
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
  const adminEmails = getAdminEmailsFromEnv()

  const authz = await requireAdmin(active, req, adminEmails)
  if (!authz.ok) {
    return new Response(JSON.stringify({ error: authz.error }), {
      status: authz.status,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    body = {}
  }

  const status = body.status ?? 'pending'
  const limit = Math.min(200, Math.max(1, body.limit ?? 50))

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
})

