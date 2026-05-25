
-- Fix profiles self-update: add WITH CHECK to prevent users from changing filial_id or must_change_password
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;

CREATE POLICY "Usuários podem atualizar próprio perfil"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND filial_id IS NOT DISTINCT FROM (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
  AND (
    must_change_password = (SELECT must_change_password FROM public.profiles WHERE id = auth.uid())
    OR is_diretor(auth.uid())
    OR is_gerente(auth.uid())
  )
);

-- Allow vendedores to view their own filial
CREATE POLICY "Vendedores podem ver própria filial"
ON public.filiais
FOR SELECT
USING (id = get_user_filial_id(auth.uid()));
