import { NextResponse } from "next/server";
import { getSessionUser, getProviderToken } from "@/features/auth/server/service";
import { listImportableRepos } from "@/features/github-sync/server/service";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getProviderToken();
  const repos = await listImportableRepos(token);

  return NextResponse.json({ repos });
}
