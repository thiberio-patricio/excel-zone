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

    // Verify caller is a director (only directors can create managers)
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
    const isCallerDiretor = callerRoleList.includes('diretor') || callerRoleList.includes('admin')

    if (!isCallerDiretor) {
      console.error('Non-director trying to create manager:', caller.id)
      return new Response(
        JSON.stringify({ error: 'Apenas diretores podem criar gerentes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate input
    const body = await req.json()
    const { email, password, nome, filial_id } = body

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

    if (nome && !isValidName(nome)) {
      return new Response(
        JSON.stringify({ error: 'Nome inválido (1-100 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating manager:', { email, nome, filial_id });

    // The auth user may already exist (e.g. profile removed previously), which
    // would make createUser fail forever with "email already registered".
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())

    let userId: string

    if (existingUser) {
      if (existingUser.id === caller.id) {
        return new Response(
          JSON.stringify({ error: 'Você não pode alterar seu próprio usuário por esta função.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .maybeSingle()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: 'Email já cadastrado no sistema.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Orphan auth user: reuse it and rebuild profile/role.
      userId = existingUser.id
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { nome: nome || 'Gerente', role: 'gerente' },
      })
      if (updateErr) throw updateErr
      console.log('Reusing orphan auth user:', userId)
    } else {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: nome || 'Gerente',
          role: 'gerente'
        }
      })

      if (userError) {
        console.error('Error creating user:', userError);
        throw userError;
      }
      if (!userData.user) throw new Error('User creation failed - no user returned');
      userId = userData.user.id
      console.log('User created successfully:', userId);
    }

    // Ensure profile exists / is up to date
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (prof) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ nome: nome || 'Gerente', email, filial_id: filial_id ?? null, ativo: true, must_change_password: true })
        .eq('id', userId)
      if (profileError) throw profileError
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId, nome: nome || 'Gerente', email, filial_id: filial_id ?? null, must_change_password: true })
      if (insertError) throw insertError
    }

    // Ensure the gerente role (the signup trigger only assigns 'vendedor')
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'gerente' })
    if (roleError) throw roleError

    return new Response(
      JSON.stringify({ success: true, user: { id: userId, email } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error);
    const rawMsg = error instanceof Error ? error.message : ''
    let clientMsg = 'Erro ao criar gerente. Tente novamente.'
    if (/already been registered|already exists|duplicate key/i.test(rawMsg)) {
      clientMsg = 'Email já cadastrado.'
    }
    return new Response(
      JSON.stringify({ error: clientMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
