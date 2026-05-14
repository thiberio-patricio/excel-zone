-- Trigger to cascade delete vendas, metas e profiles dos vendedores quando uma filial for excluída
CREATE OR REPLACE FUNCTION public.cascade_delete_filial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apaga vendas dos vendedores da filial
  DELETE FROM public.vendas
  WHERE vendedor_id IN (SELECT id FROM public.profiles WHERE filial_id = OLD.id);

  -- Apaga metas dos vendedores da filial
  DELETE FROM public.metas
  WHERE vendedor_id IN (SELECT id FROM public.profiles WHERE filial_id = OLD.id);

  -- Apaga férias dos vendedores da filial
  DELETE FROM public.ferias
  WHERE vendedor_id IN (SELECT id FROM public.profiles WHERE filial_id = OLD.id);

  -- Apaga feriados específicos da filial
  DELETE FROM public.feriados WHERE filial_id = OLD.id;

  -- Apaga roles e profiles dos usuários da filial (gerentes/vendedores)
  DELETE FROM public.user_roles
  WHERE user_id IN (SELECT id FROM public.profiles WHERE filial_id = OLD.id);

  DELETE FROM public.profiles WHERE filial_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_delete_filial ON public.filiais;
CREATE TRIGGER trg_cascade_delete_filial
BEFORE DELETE ON public.filiais
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_filial();