import { NextResponse, type NextRequest } from "next/server";
import { verifyApiKey } from "@/features/agent-keys/server/service";
import { handleMcpRequest } from "@/features/mcp/server/handler";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // Malformed json or empty body
  }

  const reqId =
    body && typeof body === "object" && !Array.isArray(body)
      ? body.id ?? null
      : null;

  const authHeader =
    request.headers.get("Authorization") || request.headers.get("authorization");

  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Invalid or revoked API key",
        },
        id: reqId,
      },
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }

  const authResult = await verifyApiKey(token);
  if (!authResult) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Invalid or revoked API key",
        },
        id: reqId,
      },
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }

  const response = await handleMcpRequest(body, {
    userId: authResult.userId,
    scopes: authResult.scopes,
  });

  return NextResponse.json(response, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
