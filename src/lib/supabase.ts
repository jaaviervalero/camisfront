import { createClient } from '@supabase/supabase-js';

// Fallback a string vacío en build time (cuando las env vars aún no están
// inyectadas por Vercel). En runtime siempre estarán presentes.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
);
