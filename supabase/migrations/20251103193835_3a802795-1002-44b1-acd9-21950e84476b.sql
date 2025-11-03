-- Criar função helper para verificar se usuário é diretor
CREATE OR REPLACE FUNCTION public.is_diretor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'diretor'
  )
$$;

-- Criar função helper para verificar se usuário é gerente
CREATE OR REPLACE FUNCTION public.is_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'gerente'
  )
$$;

-- Criar função para obter filial_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_filial_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filial_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- ==========================================
-- RLS POLICIES PARA FILIAIS
-- ==========================================

-- Diretores têm acesso total às filiais
CREATE POLICY "Diretores podem ver todas filiais" ON public.filiais
  FOR SELECT USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir filiais" ON public.filiais
  FOR INSERT WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar filiais" ON public.filiais
  FOR UPDATE USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar filiais" ON public.filiais
  FOR DELETE USING (public.is_diretor(auth.uid()));

-- Gerentes podem ver apenas sua própria filial
CREATE POLICY "Gerentes podem ver própria filial" ON public.filiais
  FOR SELECT USING (
    public.is_gerente(auth.uid()) 
    AND id = public.get_user_filial_id(auth.uid())
  );