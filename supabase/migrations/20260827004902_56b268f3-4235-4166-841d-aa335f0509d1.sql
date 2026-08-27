ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS criterios text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS referencias text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS data_inicio date,
  ADD COLUMN IF NOT EXISTS data_fim date;