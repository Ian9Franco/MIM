import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://kpdznwxhufdtvfipwwqf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_2FgSitJXwpwePyOUFR3Elg_W_ipcyOQ";

const allowDevFallback = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (allowDevFallback ? DEFAULT_SUPABASE_URL : "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (allowDevFallback ? DEFAULT_SUPABASE_ANON_KEY : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
