import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser(next?: string) {
  const user = await getSessionUser();
  if (!user) {
    // Middleware already preserves ?next for protected routes; accept an explicit
    // path when callers have it, keeping the default safe.
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes(":")) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    redirect("/login");
  }
  return user;
}

export async function getProviderToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.provider_token || null;
}
