import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeLeaderboard } from "@/features/leaderboard/server/service";
import crypto from "crypto";

function isSupabaseLive(): boolean {
  const isLive =
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    !env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    !env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder");

  return isLive;
}

function isAuthorized(authHeader: string | null, cronSecret: string): boolean {
  try {
    const expected = `Bearer ${cronSecret}`;
    const a = Buffer.from(authHeader ?? "");
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = env.CRON_SECRET || process.env.CRON_SECRET;

    if (cronSecret) {
      if (!isAuthorized(authHeader, cronSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cron secret not configured on server" },
        { status: 500 }
      );
    }

    let groupList: { id: string; name: string; slug: string }[] = [];

    if (isSupabaseLive()) {
      try {
        const admin = createAdminClient();
        const { data: groups, error } = await (admin.from("hacker_groups") as any)
          .select("id, name, slug");

        if (!error && groups && groups.length > 0) {
          groupList = groups;
        }
      } catch {
        // No fallback — return empty below
      }
    }

    if (groupList.length === 0) {
      return NextResponse.json({ success: true, processedGroups: 0, results: [] });
    }

    const results = await Promise.all(
      groupList.map(async (group: { id: string; name: string; slug: string }) => {
        try {
          const res = await computeLeaderboard(group.id);
          return {
            groupId: group.id,
            slug: group.slug,
            actives7d: res.actives_7d,
            spikeDetected: res.spike_detected,
            growthPercent: res.growth_percent,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error computing leaderboard";
          return {
            groupId: group.id,
            error: message,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      processedGroups: groupList.length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/cron/leaderboard/route.ts:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
