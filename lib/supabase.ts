import { createClient } from "@supabase/supabase-js";

// Keep the production build from crashing when Vercel environment variables
// have not been added yet. The real values are used automatically at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
