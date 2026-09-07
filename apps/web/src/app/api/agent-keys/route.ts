import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  listApiKeys,
  generateApiKey,
  revokeApiKey,
} from "@/features/agent-keys/server/service";
import { ALLOWED_SCOPES, DEFAULT_SCOPES } from "@/features/agent-keys/server/service";

export async function GET() {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/agent-keys/route.ts:", message);
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
    const name = typeof json?.name === "string" ? json.name.trim() : null;
    const rawScopes = Array.isArray(json?.scopes) ? json.scopes : [...DEFAULT_SCOPES];
    const scopes = rawScopes.filter((s: unknown): s is string =>
      typeof s === "string" && (ALLOWED_SCOPES as readonly string[]).includes(s)
    );
    if (scopes.length === 0) {
      return NextResponse.json({ error: "No valid scopes provided" }, { status: 400 });
    }

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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

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
