import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { getGroupBySlug, getGroupPeerFeed } from "@/features/hacker-groups/server/service";
import { getLeaderboardSnapshot } from "@/features/leaderboard/server/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupSlug = searchParams.get("group_slug");

    if (!groupSlug) {
      return NextResponse.json(
        { error: "Query parameter group_slug is required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { group, canonicalSlug, isGate } = await getGroupBySlug(groupSlug, userId);

    if (!group) {
      return NextResponse.json({ error: "Hacker group not found" }, { status: 404 });
    }

    if (isGate) {
      return NextResponse.json({
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          visibility: group.visibility,
          member_count: group.member_count,
        },
        isGate: true,
        canonicalSlug,
      });
    }

    const [snapshot, peerFeed] = await Promise.all([
      getLeaderboardSnapshot(groupSlug, userId),
      getGroupPeerFeed(group.id),
    ]);

    return NextResponse.json({
      group,
      leaderboard: snapshot.rankings,
      rankings: snapshot.rankings,
      actives_7d: snapshot.actives_7d,
      yesterday_snapshot: snapshot.yesterday_snapshot,
      peerFeed,
      canonicalSlug,
      isGate: false,
    });
  } catch (err: unknown) {
    console.error("GET /api/leaderboard failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
