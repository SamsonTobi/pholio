import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

export function createClient() {
  // Read NEXT_PUBLIC_* directly: only they are inlined into the browser
  // bundle, and this must never throw on click (see env client-safety test).
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
