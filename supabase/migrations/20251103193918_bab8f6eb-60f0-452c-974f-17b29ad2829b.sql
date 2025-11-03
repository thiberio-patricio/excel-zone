-- ==========================================
-- RLS POLICIES PARA PROFILES
-- ==========================================
DROP POLICY IF EXISTS "Gerentes podem ver todos perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes podem inserir perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes podem deletar perfis" ON public.profiles;

-- Diretores podem ver todos os perfis
CREATE POLICY "Diretores podem ver todos perfis" ON public.profiles
  FOR SELECT USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir perfis" ON public.profiles
  FOR INSERT WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar perfis" ON public.profiles
  FOR UPDATE USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar perfis" ON public.profiles
  FOR DELETE USING (public.is_diretor(auth.uid()));

-- Gerentes podem ver perfis da sua filial
CREATE POLICY "Gerentes podem ver perfis da filial" ON public.profiles
  FOR SELECT USING (
    public.is_gerente(auth.uid())
    AND filial_id = public.get_user_filial_id(auth.uid())
  );

CREATE POLICY "Gerentes podem inserir perfis na filial" ON public.profiles
  FOR INSERT WITH CHECK (
    public.is_gerente(auth.uid())
    AND filial_id = public.get_user_filial_id(auth.uid())
  );

CREATE POLICY "Gerentes podem atualizar perfis da filial" ON public.profiles
  FOR UPDATE USING (
    public.is_gerente(auth.uid())
    AND filial_id = public.get_user_filial_id(auth.uid())
  );

CREATE POLICY "Gerentes podem deletar perfis da filial" ON public.profiles
  FOR DELETE USING (
    public.is_gerente(auth.uid())
    AND filial_id = public.get_user_filial_id(auth.uid())
  );

-- ==========================================
-- RLS POLICIES PARA VENDAS
-- ==========================================
DROP POLICY IF EXISTS "Gerentes podem ver todas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Gerentes podem inserir vendas" ON public.vendas;
DROP POLICY IF EXISTS "Gerentes podem atualizar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Gerentes podem deletar vendas" ON public.vendas;

-- Diretores podem ver todas as vendas
CREATE POLICY "Diretores podem ver todas vendas" ON public.vendas
  FOR SELECT USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir vendas" ON public.vendas
  FOR INSERT WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar vendas" ON public.vendas
  FOR UPDATE USING (public.is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar vendas" ON public.vendas
  FOR DELETE USING (public.is_diretor(auth.uid()));

-- Gerentes podem ver vendas de vendedores da sua filial
CREATE POLICY "Gerentes podem ver vendas da filial" ON public.vendas
  FOR SELECT USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = vendas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem inserir vendas da filial" ON public.vendas
  FOR INSERT WITH CHECK (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = vendas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem atualizar vendas da filial" ON public.vendas
  FOR UPDATE USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = vendas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Gerentes podem deletar vendas da filial" ON public.vendas
  FOR DELETE USING (
    public.is_gerente(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = vendas.vendedor_id
      AND profiles.filial_id = public.get_user_filial_id(auth.uid())
    )
  );