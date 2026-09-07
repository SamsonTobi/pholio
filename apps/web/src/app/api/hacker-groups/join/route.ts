import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { joinGroupSchema } from "@/features/hacker-groups/server/schema";
import {
  joinGroupByToken,
  getInviteByToken,
} from "@/features/hacker-groups/server/service";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const inviteInfo = await getInviteByToken(token);
    return NextResponse.json(inviteInfo);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || DEMO_USER_ID;

    const json = await request.json();
    const parsed = joinGroupSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const result = await joinGroupByToken(parsed.data.token, userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
