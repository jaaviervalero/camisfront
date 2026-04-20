-- =============================================================
-- Ejecutar en Supabase → SQL Editor (después de schema.sql)
-- NOTA: el linter del IDE marca errores en ALTER TABLE ENABLE
-- ROW LEVEL SECURITY y ALTER PUBLICATION — son falsos positivos.
-- Esta sintaxis es PostgreSQL estándar y funciona en Supabase.
-- =============================================================

-- Row Level Security
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar (clientes hacen pedidos sin cuenta)
CREATE POLICY "allow_anon_insert"
  ON public.pedidos FOR INSERT WITH CHECK (true);

-- La publishable key (rol anon) puede leer — necesario para que
-- Supabase Realtime entregue los eventos INSERT al bot
CREATE POLICY "allow_anon_select"
  ON public.pedidos FOR SELECT USING (true);

-- Solo usuarios autenticados (panel admin futuro) pueden actualizar
CREATE POLICY "allow_authenticated_update"
  ON public.pedidos FOR UPDATE USING (auth.role() = 'authenticated');

-- Activar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
