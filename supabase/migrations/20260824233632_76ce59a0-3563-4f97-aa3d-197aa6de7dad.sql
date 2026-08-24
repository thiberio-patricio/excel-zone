CREATE TABLE public.campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'meta_fixa',
  mes integer NOT NULL,
  ano integer NOT NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE CASCADE,
  descricao text,
  ativa boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas TO authenticated;
GRANT ALL ON public.campanhas TO service_role;

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diretores gerenciam campanhas"
ON public.campanhas FOR ALL TO authenticated
USING (public.is_diretor(auth.uid()))
WITH CHECK (public.is_diretor(auth.uid()));

CREATE POLICY "Gerentes veem campanhas da sua filial"
ON public.campanhas FOR SELECT TO authenticated
USING (
  public.is_gerente(auth.uid())
  AND (filial_id IS NULL OR filial_id = public.get_user_filial_id(auth.uid()))
);

CREATE POLICY "Vendedores veem campanhas da sua filial"
ON public.campanhas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'vendedor')
  AND (filial_id IS NULL OR filial_id = public.get_user_filial_id(auth.uid()))
);

CREATE TRIGGER update_campanhas_updated_at
BEFORE UPDATE ON public.campanhas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();