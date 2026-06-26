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
    const isCallerDiretor = callerRoleList.includes('diretor')

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

    // Create user with admin client
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

    if (!userData.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log('User created successfully:', userData.user.id);

    // Update profile with filial_id if provided
    if (filial_id) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ filial_id })
        .eq('id', userData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      console.log('Profile updated with filial_id:', filial_id);
    }

    return new Response(
      JSON.stringify({ success: true, user: userData }),
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
