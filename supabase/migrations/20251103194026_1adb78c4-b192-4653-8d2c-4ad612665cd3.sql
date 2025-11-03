-- ==========================================
-- RLS POLICIES PARA METAS
-- ==========================================
DROP POLICY IF EXISTS "Gerentes podem ver todas metas" ON public.metas;
DROP POLICY IF EXISTS "Gerentes podem inserir metas" ON public.metas;
DROP POLICY IF EXISTS "Gerentes podem atualizar metas" ON public.metas;
DROP POLICY IF EXISTS "Gerentes podem deletar metas" ON public.metas;

-- Diretores podem ver todas as metas
CREATE POLICY "Diretores podem ver todas metas" ON public.metas
  FOR SELECT USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir metas" ON public.metas
  FOR INSERT WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar metas" ON public.metas
  FOR UPDATE USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar metas" ON public.metas
  FOR DELETE USING (public.is_diretor(auth.uid()));

-- Gerentes podem gerenciar metas de vendedores da sua filial
CREATE POLICY "Gerentes podem ver metas da filial" ON public.metas
  FOR SELECT USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem inserir metas da filial" ON public.metas
  FOR INSERT WITH CHECK (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem atualizar metas da filial" ON public.metas
  FOR UPDATE USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem deletar metas da filial" ON public.metas
  FOR DELETE USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

-- ==========================================
-- RLS POLICIES PARA USER_ROLES
-- ==========================================
DROP POLICY IF EXISTS "Gerentes podem ver todos roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gerentes podem inserir roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gerentes podem deletar roles" ON public.user_roles;

-- Diretores podem ver todos os roles
CREATE POLICY "Diretores podem ver todos roles" ON public.user_roles
  FOR SELECT USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar roles" ON public.user_roles
  FOR UPDATE USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar roles" ON public.user_roles
  FOR DELETE USING (public.is_diretor(auth.uid()));

-- Gerentes podem gerenciar roles de vendedores da sua filial
CREATE POLICY "Gerentes podem ver roles da filial" ON public.user_roles
  FOR SELECT USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem inserir roles na filial" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.is_gerente(auth.uid())
    AND role = 'vendedor'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem deletar roles da filial" ON public.user_roles
  FOR DELETE USING (
    public.is_gerente(auth.uid())
    AND role = 'vendedor'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );