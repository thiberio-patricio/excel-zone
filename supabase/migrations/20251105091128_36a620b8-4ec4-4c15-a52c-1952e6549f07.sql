-- Adicionar coluna must_change_password à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;