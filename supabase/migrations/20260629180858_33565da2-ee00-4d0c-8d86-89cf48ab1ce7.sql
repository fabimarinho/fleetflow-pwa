
-- Abastecimentos
CREATE TYPE public.tipo_combustivel AS ENUM ('gasolina','etanol','diesel','diesel_s10','gnv','flex');

CREATE TABLE public.abastecimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  motorista_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  secretaria_id uuid REFERENCES public.secretarias(id) ON DELETE SET NULL,
  data timestamptz NOT NULL DEFAULT now(),
  km integer NOT NULL,
  tipo_combustivel public.tipo_combustivel NOT NULL,
  litros numeric(10,3) NOT NULL,
  valor_litro numeric(10,3) NOT NULL,
  valor_total numeric(12,2) NOT NULL,
  posto text,
  observacoes text,
  cupom_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abastecimentos TO authenticated;
GRANT ALL ON public.abastecimentos TO service_role;
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read abastecimentos" ON public.abastecimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert abastecimentos" ON public.abastecimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/gestor can update abastecimentos" ON public.abastecimentos FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "Admin/gestor can delete abastecimentos" ON public.abastecimentos FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
CREATE TRIGGER set_updated_at_abastecimentos BEFORE UPDATE ON public.abastecimentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_abast_veiculo ON public.abastecimentos(veiculo_id, data DESC);

-- Manutencoes
CREATE TYPE public.tipo_manutencao AS ENUM ('preventiva','corretiva');
CREATE TYPE public.status_manutencao AS ENUM ('aberta','em_andamento','concluida','cancelada');

CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  tipo public.tipo_manutencao NOT NULL,
  status public.status_manutencao NOT NULL DEFAULT 'aberta',
  descricao text NOT NULL,
  oficina text,
  km integer,
  custo numeric(12,2),
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anexo_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read manutencoes" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/gestor can insert manutencoes" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "Admin/gestor can update manutencoes" ON public.manutencoes FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "Admin/gestor can delete manutencoes" ON public.manutencoes FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
CREATE TRIGGER set_updated_at_manutencoes BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_manut_veiculo ON public.manutencoes(veiculo_id, data_abertura DESC);

-- Secretarias: admin/gestor manage
DROP POLICY IF EXISTS "Authenticated can read secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admin gestor manage secretarias" ON public.secretarias;
CREATE POLICY "Authenticated can read secretarias" ON public.secretarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gestor manage secretarias" ON public.secretarias FOR ALL TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- User roles: admin can manage
DROP POLICY IF EXISTS "Admin manage user_roles" ON public.user_roles;
CREATE POLICY "Admin manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));

-- Profiles: admin/gestor can read all and update secretaria
DROP POLICY IF EXISTS "Admin gestor read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
CREATE POLICY "Admin gestor read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR id = auth.uid());
CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR id = auth.uid()) WITH CHECK (public.is_admin_or_gestor(auth.uid()) OR id = auth.uid());
