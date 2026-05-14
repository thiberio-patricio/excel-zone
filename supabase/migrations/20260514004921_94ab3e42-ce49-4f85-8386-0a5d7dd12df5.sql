
-- 1) Stop publishing sensitive tables via Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;

-- 2) Block privilege escalation: restrictive policy ensures only diretor/gerente can insert roles
CREATE POLICY "Bloquear auto atribuicao de roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (is_diretor(auth.uid()) OR is_gerente(auth.uid()));

-- 3) must_change_password bypass: trigger + secure RPC
CREATE OR REPLACE FUNCTION public.prevent_must_change_password_bypass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.must_change_password = true
     AND NEW.must_change_password = false
     AND auth.uid() = NEW.id
     AND COALESCE(current_setting('app.allow_pwd_flag_update', true), '') <> 'on'
     AND NOT is_diretor(auth.uid())
     AND NOT is_gerente(auth.uid())
  THEN
    RAISE EXCEPTION 'must_change_password só pode ser desativado via complete_password_change()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_must_change_password_bypass ON public.profiles;
CREATE TRIGGER trg_prevent_must_change_password_bypass
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_must_change_password_bypass();

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  PERFORM set_config('app.allow_pwd_flag_update', 'on', true);
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_change() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;

-- 4) Audit logs: allow diretores to read
CREATE POLICY "Diretores podem ver logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (is_diretor(auth.uid()));

-- 5) Feriados: require authentication for vendedor read policy
DROP POLICY IF EXISTS "Vendedores podem ver feriados da sua filial e nacionais" ON public.feriados;
CREATE POLICY "Vendedores podem ver feriados da sua filial e nacionais"
ON public.feriados
FOR SELECT
TO authenticated
USING ((filial_id IS NULL) OR (filial_id = get_user_filial_id(auth.uid())));

-- 6) Storage: tighten profile-photos policies
DROP POLICY IF EXISTS "Fotos de perfil são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver fotos de perfil" ON storage.objects;
DROP POLICY IF EXISTS "Gerentes podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Gerentes podem atualizar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Gerentes podem deletar fotos" ON storage.objects;

CREATE POLICY "Fotos de perfil visíveis para autenticados da mesma filial"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR is_diretor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (
          is_diretor(auth.uid())
          OR (is_gerente(auth.uid()) AND p.filial_id = get_user_filial_id(auth.uid()))
        )
    )
  )
);

CREATE POLICY "Gerentes podem fazer upload de fotos da filial"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND is_gerente(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.filial_id = get_user_filial_id(auth.uid())
  )
);

CREATE POLICY "Gerentes podem atualizar fotos da filial"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND is_gerente(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.filial_id = get_user_filial_id(auth.uid())
  )
);

CREATE POLICY "Gerentes podem deletar fotos da filial"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND is_gerente(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.filial_id = get_user_filial_id(auth.uid())
  )
);
