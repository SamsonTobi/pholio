import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./types";
import { env } from "@/lib/env";

export function getSafeNext(next: string | null): string {
  if (!next) return "/dashboard";
  // Allow only absolute paths starting with single "/" (no "//", no scheme)
  if (!next.startsWith("/") || next.startsWith("//") || next.includes(":")) {
    return "/dashboard";
  }
  return next;
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/pick-repos");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const next = encodeURIComponent(
      request.nextUrl.pathname + request.nextUrl.search
    );
    const loginUrl = new URL(`/login?next=${next}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
