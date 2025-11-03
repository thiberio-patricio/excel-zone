-- Criar tabela de filiais
CREATE TABLE IF NOT EXISTS public.filiais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  endereco text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela filiais
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_filiais_updated_at
  BEFORE UPDATE ON public.filiais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna filial_id à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL;