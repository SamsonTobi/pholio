import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { createInviteSchema } from "@/features/hacker-groups/server/schema";
import { createGroupInvite } from "@/features/hacker-groups/server/service";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const json = await request.json();
    const parsed = createInviteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid invite payload" },
        { status: 400 }
      );
    }

    const invite = await createGroupInvite(
      parsed.data.group_id,
      userId,
      parsed.data.github_username
    );

    return NextResponse.json(invite, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
