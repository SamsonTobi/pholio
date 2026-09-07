import { NextResponse, type NextRequest } from "next/server";
import { resyncSchema } from "@/features/github-sync/server/schema";
import { reparseProject } from "@/features/github-sync/server/service";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { project_id } = resyncSchema.parse(json);

    const success = await reparseProject(project_id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
