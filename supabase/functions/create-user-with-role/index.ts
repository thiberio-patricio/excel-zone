import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { email, password, nome, role } = await req.json()

    // Use the provided role or default to 'vendedor'
    const assignedRole = role || 'vendedor'

    // Find existing user by email
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr

    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id

      // Update user metadata to keep requested info (non-critical if it fails)
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          nome: nome || existingUser.user_metadata?.nome || 'Usuário',
          role: role || existingUser.user_metadata?.role || 'vendedor'
        }
      })
    } else {
      // Create user with admin client
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: nome || 'Usuário',
          role: role || 'vendedor'
        }
      })

      if (userError) throw userError
      if (!userData?.user) throw new Error('Failed to create user')

      userId = userData.user.id
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
