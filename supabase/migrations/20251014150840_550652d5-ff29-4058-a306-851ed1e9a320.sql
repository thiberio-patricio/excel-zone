-- Criar políticas para o bucket profile-photos
-- Permitir que gerentes façam upload de fotos de qualquer usuário
CREATE POLICY "Gerentes podem fazer upload de fotos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  has_role(auth.uid(), 'gerente'::user_role)
);

-- Permitir que todos vejam as fotos (bucket é público)
CREATE POLICY "Todos podem ver fotos de perfil"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Permitir que gerentes atualizem fotos
CREATE POLICY "Gerentes podem atualizar fotos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  has_role(auth.uid(), 'gerente'::user_role)
);

-- Permitir que gerentes deletem fotos
CREATE POLICY "Gerentes podem deletar fotos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  has_role(auth.uid(), 'gerente'::user_role)
);