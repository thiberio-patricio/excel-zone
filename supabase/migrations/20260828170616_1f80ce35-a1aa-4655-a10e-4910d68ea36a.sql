-- 1) Add WITH CHECK to gerente UPDATE policies (prevent cross-filial moves)
DROP POLICY IF EXISTS "Gerentes podem atualizar perfis da filial" ON public.profiles;
CREATE POLICY "Gerentes podem atualizar perfis da filial"
ON public.profiles FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()))
WITH CHECK (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()));

DROP POLICY IF EXISTS "Gerentes podem atualizar feriados da filial" ON public.feriados;
CREATE POLICY "Gerentes podem atualizar feriados da filial"
ON public.feriados FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()))
WITH CHECK (is_gerente(auth.uid()) AND filial_id = get_user_filial_id(auth.uid()));

DROP POLICY IF EXISTS "Gerentes podem atualizar vendas da filial" ON public.vendas;
CREATE POLICY "Gerentes podem atualizar vendas da filial"
ON public.vendas FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = vendas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())))
WITH CHECK (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = vendas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())));

DROP POLICY IF EXISTS "Gerentes podem atualizar metas da filial" ON public.metas;
CREATE POLICY "Gerentes podem atualizar metas da filial"
ON public.metas FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = metas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())))
WITH CHECK (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = metas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())));

DROP POLICY IF EXISTS "Gerentes podem atualizar ferias da filial" ON public.ferias;
CREATE POLICY "Gerentes podem atualizar ferias da filial"
ON public.ferias FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ferias.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())))
WITH CHECK (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ferias.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())));

DROP POLICY IF EXISTS "Gerentes podem atualizar folgas da filial" ON public.folgas;
CREATE POLICY "Gerentes podem atualizar folgas da filial"
ON public.folgas FOR UPDATE TO authenticated
USING (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())))
WITH CHECK (is_gerente(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = folgas.vendedor_id AND p.filial_id = get_user_filial_id(auth.uid())));

-- 2) Private token store for scheduled cron invocations
CREATE TABLE IF NOT EXISTS public.cron_secrets (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.cron_secrets FROM anon, authenticated;
GRANT ALL ON public.cron_secrets TO service_role;
ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: unreachable through the Data API.

INSERT INTO public.cron_secrets (name, token)
VALUES ('cron', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_cron_secret(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cron_secrets
    WHERE name = 'cron' AND _token IS NOT NULL AND token = _token
  )
$$;

REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;