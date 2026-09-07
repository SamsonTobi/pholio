import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  generateApiKeySchema,
  revokeApiKeySchema,
} from "@/features/agent-keys/server/schema";
import {
  listApiKeys,
  generateApiKey,
  revokeApiKey,
} from "@/features/agent-keys/server/service";

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
    console.error("[api] internal error in apps/web/src/app/api/api-keys/route.ts:", message);
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
    const parsed = generateApiKeySchema.parse(json);

    const result = await generateApiKey({
      userId,
      name: parsed.name,
      scopes: parsed.scopes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const json = await request.json();
    const parsed = revokeApiKeySchema.parse(json);

    const revoked = await revokeApiKey({
      userId,
      keyId: parsed.id,
    });

    if (!revoked) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
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
    const parsed = revokeApiKeySchema.parse({ id });

    const revoked = await revokeApiKey({
      userId,
      keyId: parsed.id,
    });

    if (!revoked) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
