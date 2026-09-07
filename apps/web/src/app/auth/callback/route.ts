import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/env";

function getSafeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Only allow relative paths starting with single / and containing no : or //
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":") || raw.includes("\\")) {
    return "/dashboard";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has projects
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { count } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id);

        if (!count || count === 0) {
          return NextResponse.redirect(new URL("/pick-repos", APP_URL));
        }
      }

      return NextResponse.redirect(new URL(next, APP_URL));
    }
  }

  // Return to login if authentication fails
  return NextResponse.redirect(new URL("/login?error=auth-failed", APP_URL));
}
