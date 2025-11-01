-- Criar enum user_role
CREATE TYPE user_role AS ENUM ('vendedor', 'gerente', 'diretor');

-- Criar tabela de filiais
CREATE TABLE public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  foto_url TEXT,
  filial_id UUID REFERENCES public.filiais(id),
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Criar tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  devolucao DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de metas
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vendedor_id, mes, ano)
);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    NEW.raw_user_meta_data->>'foto_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Enable RLS em todas as tabelas
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Políticas para filiais
CREATE POLICY "Diretores podem ver todas as filiais"
  ON public.filiais FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem criar filiais"
  ON public.filiais FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem atualizar filiais"
  ON public.filiais FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem deletar filiais"
  ON public.filiais FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Gerentes podem ver sua filial"
  ON public.filiais FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    id IN (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Gerentes podem ver perfis da sua filial"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    filial_id IN (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Diretores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Diretores podem atualizar todos os perfis"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem deletar perfis"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Gerentes podem deletar perfis da sua filial"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    filial_id IN (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas para user_roles
CREATE POLICY "Usuários podem ver seu próprio role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gerentes podem ver roles da sua filial"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem ver todos os roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem criar roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Diretores podem deletar roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

-- Políticas para vendas
CREATE POLICY "Vendedores podem ver suas próprias vendas"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Gerentes podem ver vendas da sua filial"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem ver todas as vendas"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Vendedores podem criar suas próprias vendas"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Gerentes podem criar vendas da sua filial"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem criar todas as vendas"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Vendedores podem atualizar suas próprias vendas"
  ON public.vendas FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Gerentes podem atualizar vendas da sua filial"
  ON public.vendas FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem atualizar todas as vendas"
  ON public.vendas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Vendedores podem deletar suas próprias vendas"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Gerentes podem deletar vendas da sua filial"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem deletar todas as vendas"
  ON public.vendas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

-- Políticas para metas
CREATE POLICY "Vendedores podem ver suas próprias metas"
  ON public.metas FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Gerentes podem ver metas da sua filial"
  ON public.metas FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem ver todas as metas"
  ON public.metas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Gerentes podem criar metas da sua filial"
  ON public.metas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem criar todas as metas"
  ON public.metas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Gerentes podem atualizar metas da sua filial"
  ON public.metas FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem atualizar todas as metas"
  ON public.metas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));

CREATE POLICY "Gerentes podem deletar metas da sua filial"
  ON public.metas FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente') AND
    vendedor_id IN (
      SELECT id FROM public.profiles 
      WHERE filial_id = (SELECT filial_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Diretores podem deletar todas as metas"
  ON public.metas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretor'));