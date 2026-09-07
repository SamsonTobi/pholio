import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { updateGroupSchema } from "@/features/hacker-groups/server/schema";
import {
  updateGroup,
  leaveOrRemoveMember,
} from "@/features/hacker-groups/server/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { id } = await params;
    const json = await request.json();
    const parsed = updateGroupSchema.parse(json);

    const group = await updateGroup({
      groupId: id,
      ownerId: userId,
      name: parsed.name,
      slug: parsed.slug,
      visibility: parsed.visibility,
    });

    return NextResponse.json({ group });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Forbidden") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("user_id") || userId;

    await leaveOrRemoveMember({
      groupId: id,
      requesterId: userId,
      targetUserId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
