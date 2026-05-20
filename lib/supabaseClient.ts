import { createClient } from '@supabase/supabase-js';

// URL base de tu proyecto de Supabase (limpia, sin '/rest/v1/' para que funcionen Auth y Storage)
const DEFAULT_SUPABASE_URL = 'https://kpdznwxhufdtvfipwwqf.supabase.co';
// Clave pública Anónima (Anon Key). Es 100% seguro compilarla en el EXE ya que la
// seguridad del servidor se rige mediante las políticas RLS de PostgreSQL.
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2FgSitJXwpwePyOUFR3Elg_W_ipcyOQ';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

