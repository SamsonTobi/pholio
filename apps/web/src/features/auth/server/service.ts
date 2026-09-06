import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
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
