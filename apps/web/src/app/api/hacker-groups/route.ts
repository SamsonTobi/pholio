import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { createGroupSchema } from "@/features/hacker-groups/server/schema";
import {
  listGroupsForUser,
  createGroup,
} from "@/features/hacker-groups/server/service";

export async function GET() {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const groups = await listGroupsForUser(userId);
    return NextResponse.json({ groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/hacker-groups/route.ts:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const json = await request.json();
    const parsed = createGroupSchema.parse(json);

    const group = await createGroup({
      ownerId: userId,
      name: parsed.name,
      slug: parsed.slug,
      visibility: parsed.visibility,
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
