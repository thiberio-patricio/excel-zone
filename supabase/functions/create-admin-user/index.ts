import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email) && email.length <= 255
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { email, password, nome } = body

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return new Response(JSON.stringify({ error: 'Senha deve ter entre 8 e 72 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!nome || typeof nome !== 'string' || nome.length < 1 || nome.length > 100) {
      return new Response(JSON.stringify({ error: 'Nome inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authorization: allow if no admin exists yet (bootstrap), otherwise require an existing admin caller.
    const { data: existingAdmins, error: countErr } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)

    if (countErr) throw countErr

    const hasAdmin = (existingAdmins?.length ?? 0) > 0

    if (hasAdmin) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
      if (!caller) {
        return new Response(JSON.stringify({ error: 'Token inválido' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: callerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
      const isAdmin = callerRoles?.some((r: any) => r.role === 'admin')
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Apenas administradores podem criar outros administradores' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Check for existing auth user
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    let userId: string
    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, role: 'admin' },
      })
      if (userError) throw userError
      if (!userData?.user) throw new Error('Falha ao criar usuário')
      userId = userData.user.id
    }

    // Ensure profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existingProfile) {
      const { error: pErr } = await supabaseAdmin.from('profiles').insert({
        id: userId, nome, email, filial_id: null, foto_url: null, must_change_password: false,
      })
      if (pErr) throw pErr
    }

    // Ensure admin role
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' })
    if (roleErr) throw roleErr

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const msg = error?.message || 'Erro desconhecido'
    console.error('create-admin-user error:', error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
