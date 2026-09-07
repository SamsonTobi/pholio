import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database, Json } from "@/lib/supabase/types";
import { env } from "@/lib/env";
import {
  computeActivityScore,
  computeRankDelta,
  RankDelta,
} from "./scoring";
import { getGroupBySlug, LeaderboardMember, HackerGroupWithMeta } from "@/features/hacker-groups/server/service";
import { createNotification } from "@/features/notifications/server/service";

export interface LeaderboardSnapshotResult {
  group: HackerGroupWithMeta | null;
  day: string;
  rankings: LeaderboardMember[];
  actives_7d: number;
  spike_detected?: boolean;
  growth_percent?: number;
  yesterday_snapshot?: {
    day: string;
    rankings: LeaderboardMember[];
  } | null;
}

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

function getPastDateString(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0]!;
}

function countActiveMembers(members: LeaderboardMember[]): number {
  return members.filter((m) => m.activity_score > 0 || m.pushes_7d > 0 || m.showcases_7d > 0).length;
}

// In-memory fallback snapshots for demo/test environments
let DEMO_SNAPSHOTS: Record<string, Record<string, LeaderboardMember[]>> = {
  g1: {
    // 2 days ago snapshot with 2 active members (used to test spike detection)
    [getPastDateString(2)]: [
      {
        user_id: "00000000-0000-0000-0000-000000000001",
        display_name: "Tobi Samson",
        slug: "tobi",
        avatar_url: null,
        role: "owner",
        activity_score: 50,
        pushes_7d: 2,
        showcases_7d: 2,
        last_push_at: null,
        current_rank: 1,
        previous_rank: null,
        delta: { delta: 0, direction: "same" },
      },
      {
        user_id: "00000000-0000-0000-0000-000000000002",
        display_name: "Siddharth Arun",
        slug: "siddharth",
        avatar_url: null,
        role: "member",
        activity_score: 30,
        pushes_7d: 1,
        showcases_7d: 1,
        last_push_at: null,
        current_rank: 2,
        previous_rank: null,
        delta: { delta: 0, direction: "same" },
      },
    ],
    // Yesterday snapshot
    [getPastDateString(1)]: [
      {
        user_id: "00000000-0000-0000-0000-000000000002",
        display_name: "Siddharth Arun",
        slug: "siddharth",
        avatar_url: null,
        role: "member",
        activity_score: 72,
        pushes_7d: 4,
        showcases_7d: 2,
        last_push_at: null,
        current_rank: 1,
        previous_rank: 2,
        delta: { delta: 1, direction: "up" },
      },
      {
        user_id: "00000000-0000-0000-0000-000000000001",
        display_name: "Tobi Samson",
        slug: "tobi",
        avatar_url: null,
        role: "owner",
        activity_score: 65,
        pushes_7d: 3,
        showcases_7d: 2,
        last_push_at: null,
        current_rank: 2,
        previous_rank: 1,
        delta: { delta: 1, direction: "down" },
      },
    ],
  },
};

/**
 * Computes live leaderboard for a group, detects active user growth spikes (>= 40% vs 48h ago),
 * saves snapshot in `leaderboard_snapshots(group_id, day, rankings)`, and triggers notifications if spiked.
 */
export async function computeLeaderboard(groupId: string): Promise<{
  group_id: string;
  day: string;
  rankings: LeaderboardMember[];
  actives_7d: number;
  spike_detected: boolean;
  growth_percent?: number;
}> {
  const today = new Date().toISOString().split("T")[0]!;
  const twoDaysAgo = getPastDateString(2);
  const yesterday = getPastDateString(1);

  if (isSupabaseLive()) {
    try {
      const admin = createAdminClient();

      // 1. Fetch group details
      const { data: group } = await (admin.from("hacker_groups") as any)
        .select("id, name, slug, created_by")
        .eq("id", groupId)
        .maybeSingle();

      // 2. Fetch group members
      const { data: members, error: membersErr } = await (admin.from("hacker_group_members") as any)
        .select("user_id, role, joined_at")
        .eq("group_id", groupId);

      if (!membersErr && members && members.length > 0) {
        const userIds = members.map((m: { user_id: string }) => m.user_id);

        // Fetch profiles
        const { data: profiles } = await (admin.from("profiles") as any)
          .select("id, display_name, slug, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? []);

        // Fetch snapshot from yesterday for rank deltas
        const { data: yesterdaySnap } = await (admin.from("leaderboard_snapshots") as any)
          .select("rankings")
          .eq("group_id", groupId)
          .eq("day", yesterday)
          .maybeSingle();

        const yesterdayRanks: Record<string, number> = {};
        if (yesterdaySnap && Array.isArray(yesterdaySnap.rankings)) {
          yesterdaySnap.rankings.forEach((r: any, idx: number) => {
            if (r.user_id) yesterdayRanks[r.user_id] = r.current_rank ?? idx + 1;
          });
        }

        // 3. Compute 7d metrics for each member
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const rawRankings: LeaderboardMember[] = await Promise.all(
          members.map(async (m: any) => {
            const profile: any = profileMap.get(m.user_id);

            // Count pushes in last 7 days
            const { count: pushesCount } = await (admin.from("github_sync_events") as any)
              .select("*", { count: "exact", head: true })
              .or(`user_id.eq.${m.user_id},owner_id.eq.${m.user_id}`)
              .gte("created_at", weekAgo);

            // Count showcases in last 7 days
            const { count: showcasesCount } = await (admin.from("showcases") as any)
              .select("*", { count: "exact", head: true })
              .eq("owner_id", m.user_id)
              .gte("published_at", weekAgo);

            // Fetch latest push time
            const { data: latestProj } = await (admin.from("projects") as any)
              .select("last_push_at")
              .eq("owner_id", m.user_id)
              .order("last_push_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const lastPushAt = latestProj?.last_push_at || null;
            const pushes7d = pushesCount || 0;
            const showcases7d = showcasesCount || 0;

            const score = computeActivityScore({
              pushes7d,
              showcases7d,
              lastPushAt,
            });

            return {
              user_id: m.user_id,
              display_name: profile?.display_name || profile?.slug || "Hacker",
              slug: profile?.slug || "user",
              avatar_url: profile?.avatar_url || null,
              role: m.role,
              activity_score: score,
              pushes_7d: pushes7d,
              showcases_7d: showcases7d,
              last_push_at: lastPushAt,
              current_rank: 0,
              previous_rank: yesterdayRanks[m.user_id] ?? null,
              delta: { delta: 0, direction: "same" },
            };
          })
        );

        // Sort descending by activity_score, tie-break by showcases_7d desc, then pushes_7d desc
        rawRankings.sort((a, b) => {
          if (b.activity_score !== a.activity_score) {
            return b.activity_score - a.activity_score;
          }
          if (b.showcases_7d !== a.showcases_7d) {
            return b.showcases_7d - a.showcases_7d;
          }
          return b.pushes_7d - a.pushes_7d;
        });

        rawRankings.forEach((m, idx) => {
          m.current_rank = idx + 1;
          m.delta = computeRankDelta(m.current_rank, m.previous_rank);
        });

        const currentActives = countActiveMembers(rawRankings);

        // 4. Growth spike detection vs 48h ago snapshot
        let spikeDetected = false;
        let growthPercent: number | undefined;

        const { data: pastSnap } = await (admin.from("leaderboard_snapshots") as any)
          .select("rankings")
          .eq("group_id", groupId)
          .lte("day", twoDaysAgo)
          .order("day", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pastSnap && Array.isArray(pastSnap.rankings)) {
          const prevActives = countActiveMembers(pastSnap.rankings as LeaderboardMember[]);
          if (prevActives > 0) {
            const growth = (currentActives - prevActives) / prevActives;
            if (growth >= 0.4) {
              spikeDetected = true;
              growthPercent = Math.round(growth * 100);

              if (group) {
                const notifyTargetIds = Array.from(new Set([group.created_by, ...userIds].filter(Boolean)));
                for (const targetId of notifyTargetIds) {
                  await createNotification({
                    userId: targetId,
                    type: "spike",
                    payload: {
                      title: "Active user growth spike detected!",
                      message: `${group.name} surged by +${growthPercent}% active builders over the last 48 hours.`,
                      group_id: groupId,
                      group_name: group.name,
                      group_slug: group.slug,
                      spike_percentage: growthPercent,
                      actives_7d: currentActives,
                      url: `/hacker-groups/${group.slug}`,
                    },
                  });
                }
              }
            }
          }
        }

        // 5. Save snapshot to leaderboard_snapshots
        await (admin.from("leaderboard_snapshots") as any).upsert(
          {
            group_id: groupId,
            day: today,
            rankings: rawRankings as unknown as Json,
          },
          { onConflict: "group_id,day" }
        );

        return {
          group_id: groupId,
          day: today,
          rankings: rawRankings,
          actives_7d: currentActives,
          spike_detected: spikeDetected,
          growth_percent: growthPercent,
        };
      }
    } catch {
      // Database connection fallback
    }
  }

  // Fallback demo computation
  const demoRankings: LeaderboardMember[] = [
    {
      user_id: "00000000-0000-0000-0000-000000000001",
      display_name: "Tobi Samson",
      slug: "tobi",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      role: "owner",
      activity_score: 95,
      pushes_7d: 5,
      showcases_7d: 3,
      last_push_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      current_rank: 1,
      previous_rank: 2,
      delta: computeRankDelta(1, 2),
    },
    {
      user_id: "00000000-0000-0000-0000-000000000002",
      display_name: "Siddharth Arun",
      slug: "siddharth",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      role: "member",
      activity_score: 72,
      pushes_7d: 4,
      showcases_7d: 2,
      last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      current_rank: 2,
      previous_rank: 1,
      delta: computeRankDelta(2, 1),
    },
    {
      user_id: "00000000-0000-0000-0000-000000000003",
      display_name: "Ada Lovelace",
      slug: "ada",
      avatar_url: null,
      role: "member",
      activity_score: 55,
      pushes_7d: 3,
      showcases_7d: 1,
      last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      current_rank: 3,
      previous_rank: 3,
      delta: computeRankDelta(3, 3),
    },
  ];

  const currentActives = countActiveMembers(demoRankings);

  // Check demo snapshots for spike
  let spikeDetected = false;
  let growthPercent: number | undefined;

  const pastDemo = DEMO_SNAPSHOTS[groupId]?.[twoDaysAgo];
  if (pastDemo) {
    const prevActives = countActiveMembers(pastDemo);
    if (prevActives > 0) {
      const growth = (currentActives - prevActives) / prevActives;
      if (growth >= 0.4) {
        spikeDetected = true;
        growthPercent = Math.round(growth * 100);

        await createNotification({
          userId: "00000000-0000-0000-0000-000000000001",
          type: "spike",
          payload: {
            title: "Active user growth spike detected!",
            message: `Activity surged by +${growthPercent}% active builders over the last 48 hours.`,
            group_id: groupId,
            spike_percentage: growthPercent,
            actives_7d: currentActives,
          },
        });
      }
    }
  }

  if (!DEMO_SNAPSHOTS[groupId]) DEMO_SNAPSHOTS[groupId] = {};
  DEMO_SNAPSHOTS[groupId][today] = demoRankings;

  return {
    group_id: groupId,
    day: today,
    rankings: demoRankings,
    actives_7d: currentActives,
    spike_detected: spikeDetected,
    growth_percent: growthPercent,
  };
}

/**
 * Returns current leaderboard snapshot and yesterday's snapshot comparison for a group slug.
 */
export async function getLeaderboardSnapshot(
  groupSlug: string,
  userId?: string | null
): Promise<LeaderboardSnapshotResult> {
  const { group, isGate } = await getGroupBySlug(groupSlug, userId);

  if (!group || isGate) {
    return {
      group: null,
      day: new Date().toISOString().split("T")[0]!,
      rankings: [],
      actives_7d: 0,
      yesterday_snapshot: null,
    };
  }

  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = getPastDateString(1);

  if (isSupabaseLive()) {
    try {
      const supabase = await createClient();

      const { data: snapshots } = await (supabase.from("leaderboard_snapshots") as any)
        .select("day, rankings")
        .eq("group_id", group.id)
        .order("day", { ascending: false })
        .limit(2);

      let todayRankings: LeaderboardMember[] | null = null;
      let yesterdayRankings: LeaderboardMember[] | null = null;

      if (snapshots && snapshots.length > 0) {
        const todaySnap = snapshots.find((s: any) => s.day === today);
        const yestSnap = snapshots.find((s: any) => s.day === yesterday);

        if (todaySnap && Array.isArray(todaySnap.rankings)) {
          todayRankings = todaySnap.rankings as LeaderboardMember[];
        }
        if (yestSnap && Array.isArray(yestSnap.rankings)) {
          yesterdayRankings = yestSnap.rankings as LeaderboardMember[];
        }
      }

      if (!todayRankings) {
        const live = await computeLeaderboard(group.id);
        todayRankings = live.rankings;
      }

      return {
        group,
        day: today,
        rankings: todayRankings,
        actives_7d: countActiveMembers(todayRankings),
        yesterday_snapshot: yesterdayRankings
          ? {
              day: yesterday,
              rankings: yesterdayRankings,
            }
          : null,
      };
    } catch {
      // Database connection fallback
    }
  }

  // Fallback demo response
  const demoToday = DEMO_SNAPSHOTS[group.id]?.[today] || (await computeLeaderboard(group.id)).rankings;
  const demoYesterday = DEMO_SNAPSHOTS[group.id]?.[yesterday] || null;

  return {
    group,
    day: today,
    rankings: demoToday,
    actives_7d: countActiveMembers(demoToday),
    yesterday_snapshot: demoYesterday
      ? {
          day: yesterday,
          rankings: demoYesterday,
        }
      : null,
  };
}
