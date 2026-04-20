-- =============================================================
-- Migración 003 — Ejecutar en Supabase → SQL Editor
-- =============================================================

-- Columna de notificación Telegram (añadida con el sistema de polling)
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS notificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para el polling (busca notificado=false frecuentemente)
CREATE INDEX IF NOT EXISTS idx_pedidos_notificado ON public.pedidos (notificado) WHERE notificado = FALSE;

-- Asegurarse de que enviado_proveedor y procesado existen (idempotente)
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS enviado_proveedor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS procesado         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lote_comunitario  TEXT;
