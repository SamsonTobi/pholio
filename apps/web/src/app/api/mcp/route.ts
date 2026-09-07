import { NextResponse, type NextRequest } from "next/server";
import { verifyApiKey } from "@/features/agent-keys/server/service";
import { handleMcpRequest } from "@/features/mcp/server/handler";

const CORS_HEADERS = {
  // Public API: any origin may call /api/mcp, but every call requires a
  // valid Bearer API key. Treat keys as secrets: rotate via dashboard
  // Settings -> API keys, revoke on leak, scope narrowly.
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

const MCP_KEY_LIMIT = 60;
const MCP_KEY_WINDOW_MS = 60_000;
const mcpKeyHits = new Map<string, { count: number; resetAt: number }>();
// NOTE: single-instance in-memory limiter. Use Redis/Upstash keyed by key
// prefix for multi-instance prod.

function checkMcpKeyLimit(prefix: string): boolean {
  const now = Date.now();
  const entry = mcpKeyHits.get(prefix);
  if (!entry || now > entry.resetAt) {
    mcpKeyHits.set(prefix, { count: 1, resetAt: now + MCP_KEY_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MCP_KEY_LIMIT;
}

/** Max JSON-RPC body: 25 batched calls x ~300KB. Auth is verified first. */
const MAX_MCP_BODY_BYTES = 8 * 1024 * 1024;

/**
 * Cheap `id` extraction for error responses without a full JSON parse
 * (keeps the JSON-RPC id-echo contract on 401/413 responses).
 */
function peekRequestId(raw: string): string | number | null {
  const m = raw.match(/"id"\s*:\s*("[^"]{0,64}"|-?\d+|null)/);
  if (!m) return null;
  const v = m[1];
  if (v === "null" || v === undefined) return null;
  if (v.startsWith('"')) return v.slice(1, -1);
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}

export async function POST(request: NextRequest) {
  // Auth BEFORE parsing: reject unauthenticated large bodies by header size,
  // then read bounded text and verify the key before JSON.parse.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_MCP_BODY_BYTES) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: body too large" },
        id: null,
      },
      { status: 413, headers: CORS_HEADERS }
    );
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    raw = "";
  }
  if (raw.length > MAX_MCP_BODY_BYTES) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: body too large" },
        id: peekRequestId(raw),
      },
      { status: 413, headers: CORS_HEADERS }
    );
  }
  const peekedId = peekRequestId(raw);

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
        id: peekedId,
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
        id: peekedId,
      },
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }

  let body: any = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    // Malformed json or empty body
  }

  const reqId =
    body && typeof body === "object" && !Array.isArray(body)
      ? body.id ?? null
      : null;

  if (!checkMcpKeyLimit(authResult.prefix ?? token.slice(0, 16))) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Rate limited. Retry in 60s." },
        id: reqId,
      },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } }
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
