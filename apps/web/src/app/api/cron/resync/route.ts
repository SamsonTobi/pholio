import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

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

/**
 * Daily backfill: touches stale projects and records `cron` sync events so
 * leaderboards/recency stay fresh even when webhooks are missed. Called by
 * pg_cron (github-resync-daily) with CRON_SECRET — never from browsers.
 */
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

    const supabase = createAdminClient();
    const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: stale } = await (supabase.from("projects") as any)
      .select("id, owner_id")
      .or(`last_push_at.lt.${staleBefore},last_push_at.is.null`)
      .limit(200);

    let touched = 0;
    if (stale && stale.length > 0) {
      const now = new Date().toISOString();
      await (supabase.from("projects") as any)
        .update({ last_push_at: now })
        .in(
          "id",
          stale.map((p: { id: string }) => p.id)
        );
      await (supabase.from("github_sync_events") as any).insert(
        stale.map((p: { id: string; owner_id: string }) => ({
          project_id: p.id,
          owner_id: p.owner_id,
          event_type: "cron",
          pushed_at: now,
        }))
      );
      touched = stale.length;
    }

    return NextResponse.json({ success: true, touched });
  } catch (err) {
    console.error("[api] internal error in apps/web/src/app/api/cron/resync/route.ts:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
