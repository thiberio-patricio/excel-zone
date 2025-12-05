-- Remove políticas que permitem vendedores inserir e atualizar vendas
DROP POLICY IF EXISTS "Vendedores podem inserir próprias vendas" ON public.vendas;
DROP POLICY IF EXISTS "Vendedores podem atualizar próprias vendas" ON public.vendas;