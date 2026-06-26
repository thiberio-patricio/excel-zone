import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72
}

function isValidName(nome: string): boolean {
  return typeof nome === 'string' && nome.length >= 1 && nome.length <= 100
}

function isValidRole(role: string): role is 'vendedor' | 'gerente' | 'diretor' {
  return ['vendedor', 'gerente', 'diretor'].includes(role)
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Extract and verify the caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ error: 'Não autorizado - token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !caller) {
      console.error('Failed to verify caller:', authError)
      return new Response(
        JSON.stringify({ error: 'Token de autenticação inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated caller:', caller.id)

    // Get caller's role
    const { data: callerRoles, error: callerRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    if (callerRoleError) {
      console.error('Failed to get caller roles:', callerRoleError)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRoleList = callerRoles?.map(r => r.role) || []
    const isCallerDiretor = callerRoleList.includes('diretor')
    const isCallerGerente = callerRoleList.includes('gerente')

    console.log('Caller roles:', callerRoleList)

    // Parse and validate input
    const body = await req.json()
    const { email, password, nome, role, filial_id, foto_url } = body

    // Input validation
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido ou muito longo (máx. 255 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password || !isValidPassword(password)) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter entre 6 e 72 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nome || !isValidName(nome)) {
      return new Response(
        JSON.stringify({ error: 'Nome inválido (1-100 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the provided role or default to 'vendedor'
    const assignedRole = role || 'vendedor'

    if (!isValidRole(assignedRole)) {
      return new Response(
        JSON.stringify({ error: 'Role inválido. Use: vendedor, gerente ou diretor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authorization checks - verify caller can assign the requested role
    // Directors can create any role
    // Managers can only create vendedores
    // Others cannot create users
    if (assignedRole === 'diretor') {
      if (!isCallerDiretor) {
        console.error('Non-director trying to create director')
        return new Response(
          JSON.stringify({ error: 'Apenas diretores podem criar outros diretores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (assignedRole === 'gerente') {
      if (!isCallerDiretor) {
        console.error('Non-director trying to create manager')
        return new Response(
          JSON.stringify({ error: 'Apenas diretores podem criar gerentes' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (assignedRole === 'vendedor') {
      if (!isCallerDiretor && !isCallerGerente) {
        console.error('Unauthorized user trying to create vendedor')
        return new Response(
          JSON.stringify({ error: 'Apenas diretores e gerentes podem criar vendedores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Branch isolation: gerentes can only create users within their own filial.
    // Override any client-supplied filial_id with the caller's actual filial_id.
    let effectiveFilialId: string | null = filial_id ?? null
    if (isCallerGerente && !isCallerDiretor) {
      const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
        .from('profiles')
        .select('filial_id')
        .eq('id', caller.id)
        .maybeSingle()
      if (callerProfileErr || !callerProfile?.filial_id) {
        console.error('Failed to load caller filial:', callerProfileErr)
        return new Response(
          JSON.stringify({ error: 'Não foi possível verificar a filial do gerente' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (filial_id && filial_id !== callerProfile.filial_id) {
        console.error('Gerente attempted cross-filial user creation', { caller: caller.id })
        return new Response(
          JSON.stringify({ error: 'Gerentes só podem criar usuários na própria filial' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      effectiveFilialId = callerProfile.filial_id
    }

    // Find existing user by email
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr

    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    let userId: string

    if (existingUser) {
      // Prevent users from modifying their own role
      if (existingUser.id === caller.id) {
        return new Response(
          JSON.stringify({ error: 'Você não pode modificar seu próprio perfil por esta função' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = existingUser.id

      // Update user metadata to keep requested info (non-critical if it fails)
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          nome: nome || existingUser.user_metadata?.nome || 'Usuário',
          role: assignedRole,
          filial_id: effectiveFilialId || existingUser.user_metadata?.filial_id,
          foto_url: foto_url || existingUser.user_metadata?.foto_url
        }
      })

      // Profile is ensured after both creation paths below.
    } else {
      // Create user with admin client
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: nome || 'Usuário',
          role: assignedRole,
          filial_id: effectiveFilialId,
          foto_url: foto_url || null
        }
      })

      if (userError) throw userError
      if (!userData?.user) throw new Error('Failed to create user')

      userId = userData.user.id

    }

    // Ensure profile exists for both existing and newly-created auth users.
    // Some users may already exist in auth without a profile, which would hide them from managers.
    const { data: existingProfile, error: profileQueryError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileQueryError) throw profileQueryError

    if (existingProfile) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: nome || 'Usuário',
          email,
          filial_id: filial_id || null,
          foto_url: foto_url || null,
        })
        .eq('id', userId)

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError)
        throw profileUpdateError
      }
    } else {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          nome: nome || 'Usuário',
          email,
          filial_id: filial_id || null,
          foto_url: foto_url || null,
          must_change_password: true,
        })

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError)
        throw profileInsertError
      }
    }

    // Ensure role exists in user_roles table for permissions
    const { data: existingRole, error: roleQueryError } = await supabaseAdmin
      .from('user_roles')
      .select('id, role')
      .eq('user_id', userId)
      .eq('role', assignedRole)
      .maybeSingle()

    if (roleQueryError) throw roleQueryError

    if (!existingRole) {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: assignedRole }, { onConflict: 'user_id,role' })

      if (roleInsertError) throw roleInsertError
    }

    console.log('Successfully processed user:', userId, 'with role:', assignedRole)

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser ? 'Usuário atualizado com sucesso' : 'Usuário criado com sucesso',
        userId,
        assignedRole
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    // Improve error visibility for debugging
    const errMsg = error?.message || error?.error || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Unknown error'
    console.error('create-user-with-role error:', error)
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
