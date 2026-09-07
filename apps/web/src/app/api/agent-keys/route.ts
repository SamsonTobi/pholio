import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  listApiKeys,
  generateApiKey,
  revokeApiKey,
} from "@/features/agent-keys/server/service";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const user = await getSessionUser().catch(() => null);
    const userId =
      user?.id || (process.env.NODE_ENV !== "production" ? DEMO_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    const userId =
      user?.id || (process.env.NODE_ENV !== "production" ? DEMO_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const name = typeof json?.name === "string" ? json.name.trim() : null;
    const scopes = Array.isArray(json?.scopes)
      ? json.scopes
      : ["showcase:write"];

    const generated = await generateApiKey({
      userId,
      name,
      scopes,
    });

    return NextResponse.json(
      {
        ...generated,
        key: generated.key,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    const userId =
      user?.id || (process.env.NODE_ENV !== "production" ? DEMO_USER_ID : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Query parameter id is required" },
        { status: 400 }
      );
    }

    const success = await revokeApiKey({ keyId: id, userId });
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
