// Admin-only user management: list, invite and sign-in links, disable/enable, delete.
// No emails are sent: links are returned to the admin, who shares them (e.g. via WhatsApp).
// Deployed with verify_jwt = false (see supabase/config.toml): the caller's JWT is verified
// below with auth.getUser(), and the admin role is read from app_metadata, which users cannot edit.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://verticale-paniek.github.io', 'http://localhost:3000']
const BAN_FOREVER = '876000h' // ~100 years; 'none' lifts a ban
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADMIN_PROTECTED = 'Admins cannot be disabled or deleted here. Remove the admin role in the database first.'

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

/** Link to our confirm page; the one-time token is exchanged there with verifyOtp. */
function confirmLink(req: Request, hashedToken: string, type: 'invite' | 'recovery'): string {
  const origin = req.headers.get('Origin') ?? ''
  const base = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return `${base}/#/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${type}`
}

async function isAdminId(admin: ReturnType<typeof createClient>, id: string): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(id)
  return data.user?.app_metadata?.role === 'admin'
}

function respond(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return respond(req, 405, { error: 'Method not allowed' })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return respond(req, 401, { error: 'Not signed in' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: caller, error: authError } = await admin.auth.getUser(token)
  if (authError || !caller.user) return respond(req, 401, { error: 'Not signed in' })
  if (caller.user.app_metadata?.role !== 'admin') return respond(req, 403, { error: 'Admins only' })
  const callerId = caller.user.id

  let body: { action?: string, email?: string, id?: string, banned?: boolean }
  try {
    body = await req.json()
  }
  catch {
    return respond(req, 400, { error: 'Invalid request' })
  }

  switch (body.action) {
    case 'list': {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      if (error) return respond(req, 500, { error: error.message })
      const users = data.users.map(u => ({
        id: u.id,
        email: u.email ?? null,
        role: (u.app_metadata?.role as string | undefined) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at || u.last_sign_in_at),
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
      }))
      return respond(req, 200, { users })
    }

    case 'invite': {
      const email = body.email?.trim().toLowerCase()
      if (!email || !EMAIL.test(email)) return respond(req, 400, { error: 'Enter a valid email address' })
      // Creates the (unconfirmed) user and returns a one-time link, without sending any email.
      const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
      if (error) return respond(req, 400, { error: error.message })
      return respond(req, 200, { link: confirmLink(req, data.properties.hashed_token, 'invite') })
    }

    case 'link': {
      // New sign-in link for an existing member: forgotten password, or an invite that expired.
      if (!body.id) return respond(req, 400, { error: 'Invalid request' })
      const { data: target, error: lookupError } = await admin.auth.admin.getUserById(body.id)
      if (lookupError || !target.user?.email) return respond(req, 400, { error: 'User not found' })
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: target.user.email })
      if (error) return respond(req, 400, { error: error.message })
      return respond(req, 200, { link: confirmLink(req, data.properties.hashed_token, 'recovery') })
    }

    case 'set-banned': {
      if (!body.id || typeof body.banned !== 'boolean') return respond(req, 400, { error: 'Invalid request' })
      if (body.id === callerId) return respond(req, 400, { error: 'You cannot disable your own account' })
      if (await isAdminId(admin, body.id)) return respond(req, 403, { error: ADMIN_PROTECTED })
      const { error } = await admin.auth.admin.updateUserById(body.id, {
        ban_duration: body.banned ? BAN_FOREVER : 'none',
      })
      if (error) return respond(req, 400, { error: error.message })
      return respond(req, 200, { ok: true })
    }

    case 'delete': {
      if (!body.id) return respond(req, 400, { error: 'Invalid request' })
      if (body.id === callerId) return respond(req, 400, { error: 'You cannot delete your own account' })
      if (await isAdminId(admin, body.id)) return respond(req, 403, { error: ADMIN_PROTECTED })
      const { error } = await admin.auth.admin.deleteUser(body.id)
      if (error) return respond(req, 400, { error: error.message })
      return respond(req, 200, { ok: true })
    }

    default:
      return respond(req, 400, { error: 'Unknown action' })
  }
})
