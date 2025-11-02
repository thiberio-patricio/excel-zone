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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      
      // Update user metadata if needed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          nome: nome || 'Usuário',
          role: role || 'vendedor'
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
      if (!userData.user) throw new Error('Failed to create user')
      
      userId = userData.user.id
    }

    // Ensure role exists in user_roles table
    const { error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .single()

    if (roleCheckError) {
      // Role doesn't exist, insert it
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: role || 'vendedor' 
        }, {
          onConflict: 'user_id,role'
        })

      if (roleInsertError) {
        console.error('Error inserting role:', roleInsertError)
        throw roleInsertError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: existingUser ? 'Usuário atualizado com sucesso' : 'Usuário criado com sucesso',
        userId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
