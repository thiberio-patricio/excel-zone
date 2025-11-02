import { supabase } from "@/integrations/supabase/client";

export async function createUserWithRole(
  email: string, 
  password: string, 
  nome: string,
  role: 'diretor' | 'gerente' | 'vendedor'
) {
  const { data, error } = await supabase.functions.invoke('create-user-with-role', {
    body: { email, password, nome, role }
  });

  if (error) throw error;
  return data;
}
