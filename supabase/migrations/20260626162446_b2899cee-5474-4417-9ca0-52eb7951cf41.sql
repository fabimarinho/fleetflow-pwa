
CREATE POLICY "Frota leitura autenticada" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'frota');
CREATE POLICY "Frota upload autenticado" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'frota');
CREATE POLICY "Frota update autenticado" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'frota');
CREATE POLICY "Frota delete autenticado" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'frota');
