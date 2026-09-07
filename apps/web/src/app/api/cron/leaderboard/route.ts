import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeLeaderboard } from "@/features/leaderboard/server/service";

function isSupabaseLive(): boolean {
  const isLive =
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    !env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    !env.SUPABASE_SERVICE_ROLE_KEY?.includes("placeholder");

  return isLive;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = env.CRON_SECRET || process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cron secret not configured on server" },
        { status: 500 }
      );
    }

    let groupList = [
      { id: "g1", name: "Lagos Hackers", slug: "lagos-hackers" },
      { id: "g2", name: "YC W26 Builders", slug: "yc-w26" },
    ];

    if (isSupabaseLive()) {
      try {
        const admin = createAdminClient();
        const { data: groups, error } = await (admin.from("hacker_groups") as any)
          .select("id, name, slug");

        if (!error && groups && groups.length > 0) {
          groupList = groups;
        }
      } catch {
        // Fallback to default group list
      }
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
