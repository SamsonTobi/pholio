import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";
import { env } from "@/lib/env";

export function createClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
