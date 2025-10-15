-- Permitir gerentes deletarem registros de vendas
CREATE POLICY "Gerentes podem deletar vendas"
ON public.vendas
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Permitir gerentes deletarem metas
CREATE POLICY "Gerentes podem deletar metas"
ON public.metas
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Permitir gerentes deletarem perfis
CREATE POLICY "Gerentes podem deletar perfis"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Permitir gerentes deletarem roles
CREATE POLICY "Gerentes podem deletar roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));