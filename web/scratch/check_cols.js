const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://kpdznwxhufdtvfipwwqf.supabase.co";
const supabaseAnonKey = "sb_publishable_2FgSitJXwpwePyOUFR3Elg_W_ipcyOQ";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from("followed_mods").select("*").limit(1);
  console.log("data:", data);
  console.log("error:", error);
}
main();
