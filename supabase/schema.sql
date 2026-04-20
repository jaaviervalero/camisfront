-- =============================================================
-- CAMIS - Schema de Base de Datos (Supabase / PostgreSQL)
-- =============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Tabla principal de pedidos
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ NOT NULL    DEFAULT NOW(),

  -- Flags de negocio
  usa_codigo_descuento  BOOLEAN     NOT NULL    DEFAULT FALSE,
  es_comunitario        BOOLEAN     NOT NULL    DEFAULT FALSE,

  -- Datos de envío (columnas individuales para queries eficientes)
  envio_nombre          TEXT        NOT NULL,
  envio_direccion       TEXT        NOT NULL,
  envio_pais            TEXT        NOT NULL,
  envio_estado_provincia TEXT       NOT NULL,
  envio_ciudad          TEXT        NOT NULL,
  envio_codigo_postal   TEXT        NOT NULL,
  envio_telefono        TEXT        NOT NULL,

  -- Ítems del pedido como array JSONB
  -- Estructura de cada ítem:
  -- {
  --   "id": "uuid",
  --   "equipo": "Real Madrid",
  --   "temporada": "2024/25",
  --   "version": "Fan" | "Player" | "Retro" | "Infantil",
  --   "talla": "M",
  --   "nombre": "OPTIONAL",
  --   "dorsal": "OPTIONAL",
  --   "url_imagen": "https://...",
  --   "precio_unitario": 15
  -- }
  items_json            JSONB       NOT NULL    DEFAULT '[]'::jsonb,

  precio_total          FLOAT8      NOT NULL,
  estado                TEXT        NOT NULL    DEFAULT 'pendiente'
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON public.pedidos (estado);

-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Permitir INSERT anónimo (clientes hacen pedidos sin autenticarse)
CREATE POLICY "allow_anonymous_insert"
  ON public.pedidos
  FOR INSERT
  WITH CHECK (true);

-- Sólo usuarios autenticados (admins) pueden leer / modificar
CREATE POLICY "allow_authenticated_select"
  ON public.pedidos
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "allow_authenticated_update"
  ON public.pedidos
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- Activar Realtime en la tabla pedidos
-- IMPORTANTE: este comando registra la tabla en la publicación
-- de Supabase Realtime para que los suscriptores reciban
-- eventos INSERT / UPDATE / DELETE en tiempo real.
-- -------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
