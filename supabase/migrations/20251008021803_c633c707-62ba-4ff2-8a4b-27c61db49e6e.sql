-- Criar tipo enum para perfis de usuário
CREATE TYPE public.user_role AS ENUM ('vendedor', 'gerente');

-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  foto_url TEXT,
  role public.user_role NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
-- Vendedores podem ver apenas seu próprio perfil
CREATE POLICY "Vendedores podem ver próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Gerentes podem ver todos os perfis
CREATE POLICY "Gerentes podem ver todos perfis"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- Usuários podem atualizar próprio perfil
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Gerentes podem inserir novos perfis
CREATE POLICY "Gerentes podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'vendedor')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Criar tabela de metas
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  valor_meta DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(vendedor_id, mes, ano)
);

-- Habilitar RLS na tabela metas
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para metas
CREATE POLICY "Vendedores podem ver próprias metas"
  ON public.metas FOR SELECT
  USING (auth.uid() = vendedor_id);

CREATE POLICY "Gerentes podem ver todas metas"
  ON public.metas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

CREATE POLICY "Gerentes podem inserir metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

CREATE POLICY "Gerentes podem atualizar metas"
  ON public.metas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- Criar tabela de vendas diárias
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  editado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(vendedor_id, data)
);

-- Habilitar RLS na tabela vendas
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vendas
CREATE POLICY "Vendedores podem ver próprias vendas"
  ON public.vendas FOR SELECT
  USING (auth.uid() = vendedor_id);

CREATE POLICY "Gerentes podem ver todas vendas"
  ON public.vendas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

CREATE POLICY "Gerentes podem inserir vendas"
  ON public.vendas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

CREATE POLICY "Gerentes podem atualizar vendas"
  ON public.vendas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS na tabela audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs
CREATE POLICY "Gerentes podem ver logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para registrar edições de vendas
CREATE OR REPLACE FUNCTION public.log_venda_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
    VALUES (
      auth.uid(),
      'UPDATE',
      'vendas',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    NEW.editado_por = auth.uid();
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_novos)
    VALUES (
      auth.uid(),
      'INSERT',
      'vendas',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_anteriores)
    VALUES (
      auth.uid(),
      'DELETE',
      'vendas',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_vendas_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.log_venda_edit();

-- Criar bucket de storage para fotos de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para fotos
CREATE POLICY "Fotos de perfil são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Usuários podem fazer upload de foto"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários podem atualizar própria foto"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários podem deletar própria foto"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );