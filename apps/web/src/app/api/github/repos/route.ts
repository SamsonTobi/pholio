import { NextResponse } from "next/server";
import { getProviderToken } from "@/features/auth/server/service";
import { listImportableRepos } from "@/features/github-sync/server/service";

export async function GET() {
  const token = await getProviderToken();
  const repos = await listImportableRepos(token);

  return NextResponse.json({ repos });
}
