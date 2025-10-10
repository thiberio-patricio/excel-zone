-- 1. Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Migrar dados existentes da tabela profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles;

-- 3. Criar função security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Atualizar RLS policies em audit_logs
DROP POLICY IF EXISTS "Gerentes podem ver logs" ON public.audit_logs;
CREATE POLICY "Gerentes podem ver logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

-- 5. Atualizar RLS policies em metas
DROP POLICY IF EXISTS "Gerentes podem ver todas metas" ON public.metas;
DROP POLICY IF EXISTS "Gerentes podem inserir metas" ON public.metas;
DROP POLICY IF EXISTS "Gerentes podem atualizar metas" ON public.metas;

CREATE POLICY "Gerentes podem ver todas metas"
ON public.metas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem inserir metas"
ON public.metas
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem atualizar metas"
ON public.metas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

-- 6. Atualizar RLS policies em profiles
DROP POLICY IF EXISTS "Gerentes podem ver todos perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes podem inserir perfis" ON public.profiles;

CREATE POLICY "Gerentes podem ver todos perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem inserir perfis"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gerente'));

-- 7. Atualizar RLS policies em vendas
DROP POLICY IF EXISTS "Gerentes podem ver todas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Gerentes podem inserir vendas" ON public.vendas;
DROP POLICY IF EXISTS "Gerentes podem atualizar vendas" ON public.vendas;

CREATE POLICY "Gerentes podem ver todas vendas"
ON public.vendas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem inserir vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem atualizar vendas"
ON public.vendas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

-- 8. RLS policies para user_roles
CREATE POLICY "Usuários podem ver próprio role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Gerentes podem ver todos roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Gerentes podem inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gerente'));

-- 9. Remover coluna role da tabela profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- 10. Atualizar trigger handle_new_user para criar role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir perfil
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email
  );
  
  -- Inserir role padrão (vendedor)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'vendedor')
  );
  
  RETURN NEW;
END;
$$;