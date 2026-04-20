-- =============================================================
-- CAMIS — Ejecutar en: Supabase → SQL Editor
-- =============================================================

CREATE TABLE IF NOT EXISTS public.pedidos (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  es_comunitario         BOOLEAN     NOT NULL    DEFAULT FALSE,
  envio_nombre           TEXT        NOT NULL,
  envio_email            TEXT        NOT NULL,
  envio_telefono         TEXT        NOT NULL,
  envio_direccion        TEXT        NOT NULL,
  envio_pais             TEXT        NOT NULL,
  envio_estado_provincia TEXT        NOT NULL,
  envio_ciudad           TEXT        NOT NULL,
  envio_codigo_postal    TEXT        NOT NULL,
  items_json             JSONB       NOT NULL    DEFAULT '[]',
  precio_total           FLOAT8      NOT NULL,
  estado                 TEXT        NOT NULL    DEFAULT 'pendiente'
);

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON public.pedidos (estado);
