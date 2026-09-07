import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  createShowcaseSchema,
  updateShowcaseSchema,
} from "@/features/showcases/server/schema";
import {
  publishShowcase,
  updateShowcase,
  removeShowcase,
  listShowcasesByProject,
  listShowcasesByOwner,
} from "@/features/showcases/server/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const ownerId = searchParams.get("owner_id");

    if (projectId) {
      const showcases = await listShowcasesByProject(projectId);
      return NextResponse.json({ showcases });
    }

    if (ownerId) {
      const showcases = await listShowcasesByOwner(ownerId);
      return NextResponse.json({ showcases });
    }

    return NextResponse.json(
      { error: "Query parameter project_id or owner_id is required" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = createShowcaseSchema.parse(json);
    const showcase = await publishShowcase({
      ownerId: user.id,
      projectId: parsed.project_id,
      body: parsed.body,
      source: parsed.source,
      isPinned: parsed.is_pinned,
      meta: parsed.meta,
    });

    return NextResponse.json({ showcase }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = updateShowcaseSchema.parse(json);
    const showcase = await updateShowcase({
      id: parsed.id,
      ownerId: user.id,
      body: parsed.body,
      isPinned: parsed.is_pinned,
      meta: parsed.meta,
    });

    return NextResponse.json({ showcase });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
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

    await removeShowcase({ id, ownerId: user.id });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
