import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[db] SUPABASE_URL or SUPABASE_SECRET_KEY is not set. Database features will be disabled.");
}

export const pool = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function ensureSchema() {
  // Schema is managed via the Supabase dashboard or sql dump.
  // The REST API doesn't run raw DDL queries.
  return;
}
