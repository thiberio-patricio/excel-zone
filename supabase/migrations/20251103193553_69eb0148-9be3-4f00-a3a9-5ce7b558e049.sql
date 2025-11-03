-- Adicionar role "diretor" ao enum existente
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'diretor';