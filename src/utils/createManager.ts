import { supabase } from "@/integrations/supabase/client";

export async function createManager(email: string, password: string, nome?: string) {
  const { data, error } = await supabase.functions.invoke('create-manager', {
    body: { email, password, nome }
  });

  if (error) throw error;
  return data;
}
