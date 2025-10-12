-- Adicionar políticas para vendedores gerenciarem suas próprias vendas
CREATE POLICY "Vendedores podem atualizar próprias vendas"
  ON public.vendas
  FOR UPDATE
  USING (auth.uid() = vendedor_id);

CREATE POLICY "Vendedores podem inserir próprias vendas"
  ON public.vendas
  FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);