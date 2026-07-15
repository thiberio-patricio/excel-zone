CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always insert profile with NULL filial_id; elevated assignments happen via audited edge functions
  INSERT INTO public.profiles (id, nome, email, filial_id, foto_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email,
    NULL,
    NEW.raw_user_meta_data->>'foto_url'
  );

  -- Always assign lowest-privilege role. Role escalation is only possible via
  -- create-user-with-role / create-manager edge functions which enforce caller authorization.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');

  RETURN NEW;
END;
$function$;