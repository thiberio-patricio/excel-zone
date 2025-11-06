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

    const { email, password, nome, filial_id } = await req.json()

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
