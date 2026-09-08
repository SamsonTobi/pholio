import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  listProjectsByOwner,
  getProjectById,
  updateProject,
} from "@/features/projects/server/service";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await listProjectsByOwner(user.id);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/projects/route.ts:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Query parameter id is required" },
        { status: 400 }
      );
    }
    const json = await request.json();
    const allowed: Record<string, unknown> = {};
    for (const key of [
      "name",
      "description",
      "readme_summary",
      "tags",
      "live_url",
      "status",
      "show_on_showcase",
    ] as const) {
      if (key in json) allowed[key] = json[key];
    }

    const existing = await getProjectById(id, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await updateProject(id, allowed, user.id);
    return NextResponse.json({ project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
