import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { resyncSchema } from "@/features/github-sync/server/schema";
import { reparseProject } from "@/features/github-sync/server/service";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { project_id } = resyncSchema.parse(json);

    const success = await reparseProject(project_id, user.id);
    if (!success) {
      return NextResponse.json({ error: "Project not found or forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
