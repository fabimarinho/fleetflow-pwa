
CREATE TYPE public.app_role AS ENUM ('administrador', 'gestor', 'motorista');
CREATE TYPE public.veiculo_status AS ENUM ('disponivel', 'em_uso', 'em_manutencao');
CREATE TYPE public.viagem_status AS ENUM ('em_andamento', 'finalizada', 'cancelada');

CREATE TABLE public.secretarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secretarias TO authenticated;
GRANT ALL ON public.secretarias TO service_role;
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  matricula TEXT,
  telefone TEXT,
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrador','gestor'))
$$;

CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  marca TEXT,
  ano INTEGER,
  tipo TEXT,
  cor TEXT,
  km_atual INTEGER NOT NULL DEFAULT 0,
  status public.veiculo_status NOT NULL DEFAULT 'disponivel',
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.viagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero BIGSERIAL,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  motorista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE SET NULL,
  servidor_nome TEXT,
  servidor_matricula TEXT,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  objetivo TEXT,
  km_saida INTEGER NOT NULL,
  km_retorno INTEGER,
  hora_saida TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_chegada TIMESTAMPTZ,
  foto_hodometro_saida_url TEXT,
  foto_hodometro_retorno_url TEXT,
  assinatura_url TEXT,
  combustivel TEXT,
  ocorrencias TEXT,
  status public.viagem_status NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX viagens_veiculo_idx ON public.viagens(veiculo_id);
CREATE INDEX viagens_motorista_idx ON public.viagens(motorista_id);
CREATE INDEX viagens_status_idx ON public.viagens(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viagens TO authenticated;
GRANT ALL ON public.viagens TO service_role;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_secretarias_updated BEFORE UPDATE ON public.secretarias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_viagens_updated BEFORE UPDATE ON public.viagens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'motorista');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Autenticados veem secretarias" ON public.secretarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/gestor gerenciam secretarias" ON public.secretarias FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Autenticados veem perfis" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario edita proprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'administrador'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "Admin insere perfis" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'administrador'));

CREATE POLICY "Usuario ve seus papeis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "Admin gerencia papeis" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'administrador'));

CREATE POLICY "Autenticados veem veiculos" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/gestor gerenciam veiculos" ON public.veiculos FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Autenticados veem viagens" ON public.viagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Motorista cria viagem" ON public.viagens FOR INSERT TO authenticated
  WITH CHECK (motorista_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "Motorista atualiza viagem" ON public.viagens FOR UPDATE TO authenticated
  USING (motorista_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (motorista_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "Admin/gestor apagam viagem" ON public.viagens FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));
