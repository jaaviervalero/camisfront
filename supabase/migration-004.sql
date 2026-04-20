-- =============================================================
-- Migración 004 — Ejecutar en Supabase → SQL Editor
-- =============================================================

-- Eliminar acceso público de lectura: cualquiera podía hacer SELECT *
-- y obtener emails, teléfonos y direcciones de todos los clientes.
DROP POLICY IF EXISTS "allow_anon_select" ON public.pedidos;

-- Eliminar inserción anónima directa: los inserts ahora pasan por
-- el Route Handler /api/pedido (Next.js) que usa service_role_key
-- y valida + recalcula los precios server-side.
DROP POLICY IF EXISTS "allow_anon_insert" ON public.pedidos;

-- La policy allow_authenticated_update se mantiene para futuros
-- usos de un panel admin con sesión Supabase Auth.
-- El bot usa service_role_key y bypasea RLS sin necesitarla.
