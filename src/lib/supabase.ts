import { createClient } from '@supabase/supabase-js';

// Lazy singleton: el cliente se crea la primera vez que se usa,
// no al importar el módulo (evita crash en build de Vercel).
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error(
        'Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY',
      );
    }
    _client = createClient(url, anon);
  }
  return _client;
}

// Re-exportación directa para los archivos que ya usan `supabase.xxx`
export const supabase = {
  from:    (...args: Parameters<ReturnType<typeof createClient>['from']>) =>
             getSupabase().from(...args),
  channel: (...args: Parameters<ReturnType<typeof createClient>['channel']>) =>
             getSupabase().channel(...args),
};
