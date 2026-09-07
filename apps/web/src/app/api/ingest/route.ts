import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  checkSessionRateLimit,
  getClientIp,
} from "@/features/telemetry/server/rate-limit";
import { ingestSchema } from "@/features/telemetry/server/schema";
import { ingestEvent } from "@/features/telemetry/server/service";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  const rate = checkRateLimit(clientIp);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(rate.retryAfter ?? 60),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const sessionRate = checkSessionRateLimit(parsed.data.session_hash);
  if (!sessionRate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(sessionRate.retryAfter ?? 60),
        },
      }
    );
  }

  try {
    const success = await ingestEvent({
      telemetrySlug: parsed.data.telemetry_slug,
      sessionHash: parsed.data.session_hash,
      path: parsed.data.path,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  } catch (err) {
    console.error("ingest failed", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: CORS_HEADERS }
  );
}
