-- 1) Meta de ticket médio por vendedor/mês
ALTER TABLE public.metas
  ADD COLUMN IF NOT EXISTS meta_ticket numeric NOT NULL DEFAULT 500;

-- 2) Folgas
CREATE TABLE IF NOT EXISTS public.folgas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL,
  data date NOT NULL,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folgas TO authenticated;
GRANT ALL ON public.folgas TO service_role;

ALTER TABLE public.folgas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diretores podem ver todas folgas" ON public.folgas
  FOR SELECT TO authenticated USING (is_diretor(auth.uid()));
CREATE POLICY "Diretores podem inserir folgas" ON public.folgas
  FOR INSERT TO authenticated WITH CHECK (is_diretor(auth.uid()));
CREATE POLICY "Diretores podem atualizar folgas" ON public.folgas
  FOR UPDATE TO authenticated USING (is_diretor(auth.uid()));
CREATE POLICY "Diretores podem deletar folgas" ON public.folgas
  FOR DELETE TO authenticated USING (is_diretor(auth.uid()));

CREATE POLICY "Gerentes podem ver folgas da filial" ON public.folgas
  FOR SELECT TO authenticated USING (
    is_gerente(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())
    )
  );
CREATE POLICY "Gerentes podem inserir folgas da filial" ON public.folgas
  FOR INSERT TO authenticated WITH CHECK (
    is_gerente(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())
    )
  );
CREATE POLICY "Gerentes podem atualizar folgas da filial" ON public.folgas
  FOR UPDATE TO authenticated USING (
    is_gerente(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())
    )
  );
CREATE POLICY "Gerentes podem deletar folgas da filial" ON public.folgas
  FOR DELETE TO authenticated USING (
    is_gerente(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())
    )
  );

CREATE POLICY "Vendedores podem ver proprias folgas" ON public.folgas
  FOR SELECT TO authenticated USING (auth.uid() = vendedor_id);

CREATE INDEX IF NOT EXISTS folgas_vendedor_data_idx ON public.folgas (vendedor_id, data);