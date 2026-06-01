DROP POLICY IF EXISTS "Gerentes podem inserir roles na filial" ON public.user_roles;

CREATE POLICY "Gerentes podem inserir roles na filial"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_gerente(auth.uid())
  AND role = 'vendedor'::user_role
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_roles.user_id
      AND profiles.filial_id = get_user_filial_id(auth.uid())
  )
);