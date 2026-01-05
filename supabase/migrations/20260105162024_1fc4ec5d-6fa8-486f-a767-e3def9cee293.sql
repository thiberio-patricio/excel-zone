-- Tabela para feriados
CREATE TABLE public.feriados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para férias de vendedores
CREATE TABLE public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

-- Políticas para feriados (feriados nacionais tem filial_id = null)
CREATE POLICY "Diretores podem ver todos feriados"
ON public.feriados FOR SELECT
USING (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir feriados"
ON public.feriados FOR INSERT
WITH CHECK (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar feriados"
ON public.feriados FOR UPDATE
USING (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar feriados"
ON public.feriados FOR DELETE
USING (is_diretor(auth.uid()));

CREATE POLICY "Gerentes podem ver feriados da filial e nacionais"
ON public.feriados FOR SELECT
USING (is_gerente(auth.uid()) AND (filial_id IS NULL OR filial_id = get_user_filial_id(auth.uid())));

CREATE POLICY "Gerentes podem inserir feriados da filial"
ON public.feriados FOR INSERT
WITH CHECK (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()));

CREATE POLICY "Gerentes podem atualizar feriados da filial"
ON public.feriados FOR UPDATE
USING (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()));

CREATE POLICY "Gerentes podem deletar feriados da filial"
ON public.feriados FOR DELETE
USING (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()));

CREATE POLICY "Vendedores podem ver feriados da sua filial e nacionais"
ON public.feriados FOR SELECT
USING ((filial_id IS NULL OR filial_id = get_user_filial_id(auth.uid())));

-- Políticas para férias
CREATE POLICY "Diretores podem ver todas ferias"
ON public.ferias FOR SELECT
USING (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem inserir ferias"
ON public.ferias FOR INSERT
WITH CHECK (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem atualizar ferias"
ON public.ferias FOR UPDATE
USING (is_diretor(auth.uid()));

CREATE POLICY "Diretores podem deletar ferias"
ON public.ferias FOR DELETE
USING (is_diretor(auth.uid()));

CREATE POLICY "Gerentes podem ver ferias da filial"
ON public.ferias FOR SELECT
USING (is_gerente(auth.uid()) AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = ferias.vendedor_id AND profiles.filial_id = get_user_filial_id(auth.uid())
));

CREATE POLICY "Gerentes podem inserir ferias da filial"
ON public.ferias FOR INSERT
WITH CHECK (is_gerente(auth.uid()) AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = ferias.vendedor_id AND profiles.filial_id = get_user_filial_id(auth.uid())
));

CREATE POLICY "Gerentes podem atualizar ferias da filial"
ON public.ferias FOR UPDATE
USING (is_gerente(auth.uid()) AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = ferias.vendedor_id AND profiles.filial_id = get_user_filial_id(auth.uid())
));

CREATE POLICY "Gerentes podem deletar ferias da filial"
ON public.ferias FOR DELETE
USING (is_gerente(auth.uid()) AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = ferias.vendedor_id AND profiles.filial_id = get_user_filial_id(auth.uid())
));

CREATE POLICY "Vendedores podem ver proprias ferias"
ON public.ferias FOR SELECT
USING (auth.uid() = vendedor_id);