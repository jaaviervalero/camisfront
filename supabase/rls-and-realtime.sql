-- =============================================================
-- Ejecutar DESPUÉS de schema.sql, también en el SQL Editor
-- =============================================================

-- Row Level Security
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anonymous_insert"
  ON public.pedidos FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_authenticated_select"
  ON public.pedidos FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "allow_authenticated_update"
  ON public.pedidos FOR UPDATE USING (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
