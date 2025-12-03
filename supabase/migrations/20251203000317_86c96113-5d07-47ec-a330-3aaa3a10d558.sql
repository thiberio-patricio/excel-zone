-- Criar constraint única para permitir upsert de metas
ALTER TABLE public.metas ADD CONSTRAINT metas_vendedor_mes_ano_unique UNIQUE (vendedor_id, mes, ano);