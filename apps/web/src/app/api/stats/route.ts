import { NextResponse, type NextRequest } from "next/server";
import { statsQuerySchema } from "@/features/telemetry/server/schema";
import { getStats } from "@/features/telemetry/server/service";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawProjectSlug =
      searchParams.get("project_slug") || searchParams.get("telemetry_slug");
    const rawDays = searchParams.get("days") ?? undefined;

    const parsed = statsQuerySchema.safeParse({
      project_slug: rawProjectSlug,
      days: rawDays,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const stats = await getStats({
      projectSlug: parsed.data.project_slug,
      days: parsed.data.days,
    });

    return NextResponse.json(stats, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
