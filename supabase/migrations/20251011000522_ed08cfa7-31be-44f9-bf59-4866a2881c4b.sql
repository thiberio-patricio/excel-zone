-- Adicionar coluna devolucao na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN devolucao NUMERIC DEFAULT 0 NOT NULL;