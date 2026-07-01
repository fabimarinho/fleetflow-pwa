
ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS checklist_saida jsonb,
  ADD COLUMN IF NOT EXISTS checklist_retorno jsonb,
  ADD COLUMN IF NOT EXISTS assinatura_retorno_url text;

ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS proximo_oleo_km integer,
  ADD COLUMN IF NOT EXISTS licenciamento_ate date,
  ADD COLUMN IF NOT EXISTS ipva_ate date,
  ADD COLUMN IF NOT EXISTS seguro_ate date;
