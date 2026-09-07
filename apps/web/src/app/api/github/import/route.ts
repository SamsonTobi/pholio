import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getProviderToken } from "@/features/auth/server/service";
import { importSchema } from "@/features/github-sync/server/schema";
import { importRepos } from "@/features/github-sync/server/service";
import { getById } from "@/features/profile/server/service";
import { showcaseUrl } from "@/lib/env";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";

  try {
    const json = await request.json();
    const { repo_full_names } = importSchema.parse(json);
    const token = await getProviderToken();

    const created = await importRepos(userId, repo_full_names, token);
    const profile = await getById(userId);
    const redirectUrl = profile ? showcaseUrl(profile.slug) : "/dashboard";

    return NextResponse.json({
      success: true,
      projects: created,
      redirectUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
