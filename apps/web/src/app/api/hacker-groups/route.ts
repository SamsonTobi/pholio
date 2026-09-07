import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { createGroupSchema } from "@/features/hacker-groups/server/schema";
import {
  listGroupsForUser,
  createGroup,
} from "@/features/hacker-groups/server/service";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const user = await getSessionUser().catch(() => null);
    const userId = user?.id || DEMO_USER_ID;

    const groups = await listGroupsForUser(userId);
    return NextResponse.json({ groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user?.id || DEMO_USER_ID;

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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
