-- Atualizar a função handle_new_user para definir filial_id automaticamente
-- quando um gerente ou diretor cria um novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  creator_filial_id UUID;
BEGIN
  -- Se o usuário está sendo criado com metadata de filial_id, usar isso
  IF NEW.raw_user_meta_data ? 'filial_id' THEN
    creator_filial_id := (NEW.raw_user_meta_data->>'filial_id')::UUID;
  ELSE
    -- Tentar obter a filial do usuário autenticado (quem está criando)
    SELECT filial_id INTO creator_filial_id
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;
  
  -- Inserir perfil com filial_id já definida
  INSERT INTO public.profiles (id, nome, email, filial_id, foto_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email,
    creator_filial_id,
    NEW.raw_user_meta_data->>'foto_url'
  );
  
  -- Inserir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'vendedor')
  );
  
  RETURN NEW;
END;
$function$;