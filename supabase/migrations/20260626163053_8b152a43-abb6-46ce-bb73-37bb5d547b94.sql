
ALTER TABLE public.viagens
  ADD CONSTRAINT viagens_motorista_profile_fkey
  FOREIGN KEY (motorista_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
