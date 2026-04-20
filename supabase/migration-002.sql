-- =============================================================
-- Migración 002 — Ejecutar en Supabase → SQL Editor
-- =============================================================

-- Dirección opcional (pedidos comunitarios no la necesitan)
ALTER TABLE public.pedidos
  ALTER COLUMN envio_direccion        DROP NOT NULL,
  ALTER COLUMN envio_pais             DROP NOT NULL,
  ALTER COLUMN envio_estado_provincia DROP NOT NULL,
  ALTER COLUMN envio_ciudad           DROP NOT NULL,
  ALTER COLUMN envio_codigo_postal    DROP NOT NULL,
  ALTER COLUMN envio_telefono         DROP NOT NULL;

-- Columna para pedidos comunitarios: a qué "lote" pertenecen
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS lote_comunitario TEXT;      -- ej: "2025-04-20"

-- Estados de procesamiento
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS enviado_proveedor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS procesado         BOOLEAN NOT NULL DEFAULT FALSE;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_pedidos_comunitario ON public.pedidos (es_comunitario, enviado_proveedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_procesado   ON public.pedidos (procesado);
