import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/types";
import { CreateGroupInput } from "./schema";
import { inviteUrl } from "@/lib/env";
import {
  computeActivityScore,
  computeRankDelta,
  computeDelta,
  RankDelta,
  DeltaResult,
} from "@/features/leaderboard/server/scoring";

export type HackerGroupRow = Database["public"]["Tables"]["hacker_groups"]["Row"];
export type GroupMemberRow = Database["public"]["Tables"]["hacker_group_members"]["Row"];
export type GroupInviteRow = Database["public"]["Tables"]["hacker_group_invites"]["Row"];

export interface HackerGroupWithMeta extends HackerGroupRow {
  member_count: number;
  user_role?: "owner" | "member" | null;
  is_member?: boolean;
}

export interface LeaderboardMember {
  user_id: string;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  role: "owner" | "member";
  activity_score: number;
  pushes_7d: number;
  showcases_7d: number;
  last_push_at: string | null;
  current_rank: number;
  previous_rank: number | null;
  delta: RankDelta;
}

export interface PeerActivityItem {
  id: string;
  type: "showcase" | "push";
  user_name: string;
  user_slug: string;
  avatar_url: string | null;
  message: string;
  timestamp: string;
}

// In-memory demo fallback storage
let DEMO_GROUPS: HackerGroupWithMeta[] = [
  {
    id: "g1",
    name: "Lagos Hackers",
    slug: "lagos-hackers",
    visibility: "public",
    created_by: "00000000-0000-0000-0000-000000000001",
    slug_history: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    member_count: 4,
    user_role: "owner",
    is_member: true,
  },
  {
    id: "g2",
    name: "YC W26 Builders",
    slug: "yc-w26",
    visibility: "private",
    created_by: "00000000-0000-0000-0000-000000000001",
    slug_history: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    member_count: 2,
    user_role: "owner",
    is_member: true,
  },
];

let DEMO_MEMBERS: Record<string, LeaderboardMember[]> = {
  g1: [
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
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
      role: "member",
      activity_score: 55,
      pushes_7d: 3,
      showcases_7d: 1,
      last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      current_rank: 3,
      previous_rank: 3,
      delta: computeRankDelta(3, 3),
    },
    {
      user_id: "00000000-0000-0000-0000-000000000004",
      display_name: "Femi Alabi",
      slug: "femi",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
      role: "member",
      activity_score: 25,
      pushes_7d: 2,
      showcases_7d: 0,
      last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      current_rank: 4,
      previous_rank: 4,
      delta: computeRankDelta(4, 4),
    },
  ],
  g2: [
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
      previous_rank: null,
      delta: computeRankDelta(1, null),
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
      previous_rank: null,
      delta: computeRankDelta(2, null),
    },
  ],
};

let DEMO_INVITES: Record<
  string,
  {
    group_id: string;
    token: string;
    multi_use: boolean;
    github_username?: string | null;
    used_at?: string | null;
  }
> = {
  "lagos-invite-demo": {
    group_id: "g1",
    token: "lagos-invite-demo",
    multi_use: true,
  },
  "yc-invite-demo": {
    group_id: "g2",
    token: "yc-invite-demo",
    multi_use: true,
  },
};

let DEMO_ACTIVITIES: Record<string, PeerActivityItem[]> = {
  g1: [
    {
      id: "act-1",
      type: "push",
      user_name: "Tobi Samson",
      user_slug: "tobi",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      message: "Pushed 4 commits to pholio (main branch)",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "act-2",
      type: "showcase",
      user_name: "Siddharth Arun",
      user_slug: "siddharth",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      message: "Published showcase update: Implemented dark mode token system with zero layout shift",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ],
  g2: [
    {
      id: "act-5",
      type: "showcase",
      user_name: "Tobi Samson",
      user_slug: "tobi",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      message: "Published showcase update: Automated sports ML predictions with risk management",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
  ],
};

/**
 * Creates a new hacker group and assigns creator as owner.
 */
export async function createGroup(params: {
  ownerId: string;
  name: string;
  slug: string;
  visibility?: "public" | "private";
}): Promise<HackerGroupWithMeta> {
  const cleanSlug = params.slug.toLowerCase().trim();
  const visibility = params.visibility ?? "private";

  try {
    const supabase = await createClient();

    // Check slug uniqueness
    const { data: existing } = await (supabase.from("hacker_groups") as any)
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      throw new Error("A hacker group with this slug already exists");
    }

    const { data: group, error: createError } = await (supabase.from("hacker_groups") as any)
      .insert({
        name: params.name.trim(),
        slug: cleanSlug,
        visibility,
        created_by: params.ownerId,
        slug_history: [],
      })
      .select()
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    // Add creator as owner
    await (supabase.from("hacker_group_members") as any).insert({
      group_id: group.id,
      user_id: params.ownerId,
      role: "owner",
    });

    return {
      ...group,
      member_count: 1,
      user_role: "owner",
      is_member: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("already exists")) throw err;
    // Fallback in memory
  }

  const existingDemo = DEMO_GROUPS.find((g) => g.slug === cleanSlug);
  if (existingDemo) {
    throw new Error("A hacker group with this slug already exists");
  }

  const newGroup: HackerGroupWithMeta = {
    id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: params.name.trim(),
    slug: cleanSlug,
    visibility,
    created_by: params.ownerId,
    slug_history: [],
    created_at: new Date().toISOString(),
    member_count: 1,
    user_role: "owner",
    is_member: true,
  };

  DEMO_GROUPS.unshift(newGroup);

  DEMO_MEMBERS[newGroup.id] = [
    {
      user_id: params.ownerId,
      display_name: "You",
      slug: "you",
      avatar_url: null,
      role: "owner",
      activity_score: 10,
      pushes_7d: 1,
      showcases_7d: 0,
      last_push_at: new Date().toISOString(),
      current_rank: 1,
      previous_rank: null,
      delta: computeRankDelta(1, null),
    },
  ];

  return newGroup;
}

export const createHackerGroup = (
  userId: string,
  input: CreateGroupInput
): Promise<HackerGroupWithMeta> =>
  createGroup({
    ownerId: userId,
    name: input.name,
    slug: input.slug,
    visibility: input.visibility,
  });

/**
 * Updates group settings (name, slug, visibility), tracking slug history.
 * Requires requester to be owner.
 */
export async function updateGroup(params: {
  groupId: string;
  ownerId: string;
  name?: string;
  slug?: string;
  visibility?: "public" | "private";
}): Promise<HackerGroupWithMeta> {
  const cleanSlug = params.slug?.toLowerCase().trim();

  try {
    const supabase = await createClient();

    // Verify ownership
    const { data: group } = await (supabase.from("hacker_groups") as any)
      .select("*")
      .eq("id", params.groupId)
      .maybeSingle();

    if (!group) {
      throw new Error("Hacker group not found");
    }

    const { data: ownerMember } = await (supabase.from("hacker_group_members") as any)
      .select("role")
      .eq("group_id", params.groupId)
      .eq("user_id", params.ownerId)
      .eq("role", "owner")
      .maybeSingle();

    if (group.created_by !== params.ownerId && !ownerMember) {
      throw new Error("Forbidden: Only group owners can update group settings");
    }

    const updates: Record<string, unknown> = {};
    if (params.name) updates.name = params.name.trim();
    if (params.visibility) updates.visibility = params.visibility;

    if (cleanSlug && cleanSlug !== group.slug) {
      // Check slug uniqueness
      const { data: existing } = await (supabase.from("hacker_groups") as any)
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (existing && existing.id !== params.groupId) {
        throw new Error("A hacker group with this slug already exists");
      }

      updates.slug = cleanSlug;
      const history = Array.isArray(group.slug_history) ? group.slug_history : [];
      if (!history.includes(group.slug)) {
        updates.slug_history = [...history, group.slug];
      }
    }

    const { data: updated, error } = await (supabase.from("hacker_groups") as any)
      .update(updates)
      .eq("id", params.groupId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      ...updated,
      member_count: 1,
      user_role: "owner",
      is_member: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("already exists") || message.includes("Forbidden") || message.includes("not found")) {
      throw err;
    }
  }

  // Demo fallback
  const demo = DEMO_GROUPS.find((g) => g.id === params.groupId);
  if (!demo) throw new Error("Hacker group not found");
  const isOwner =
    demo.created_by === params.ownerId ||
    DEMO_MEMBERS[params.groupId]?.some(
      (m) => m.user_id === params.ownerId && m.role === "owner"
    );
  if (!isOwner) {
    throw new Error("Forbidden: Only group owners can update group settings");
  }

  if (params.name) demo.name = params.name.trim();
  if (params.visibility) demo.visibility = params.visibility;
  if (cleanSlug && cleanSlug !== demo.slug) {
    if (DEMO_GROUPS.some((g) => g.slug === cleanSlug && g.id !== params.groupId)) {
      throw new Error("A hacker group with this slug already exists");
    }
    demo.slug_history = [...(demo.slug_history || []), demo.slug];
    demo.slug = cleanSlug;
  }

  return demo;
}

/**
 * Gets a group by its current or historical slug, checking access for private groups.
 */
export async function getGroupBySlug(
  slug: string,
  userId?: string | null
): Promise<{
  group: HackerGroupWithMeta | null;
  canonicalSlug?: string;
  isGate?: boolean;
}> {
  try {
    const supabase = await createClient();

    let { data: group } = await (supabase.from("hacker_groups") as any)
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    let canonicalSlug: string | undefined;

    if (!group) {
      // Check slug history
      const { data: historic } = await (supabase.from("hacker_groups") as any)
        .select("*")
        .contains("slug_history", [slug])
        .maybeSingle();

      if (historic) {
        group = historic;
        canonicalSlug = historic.slug;
      }
    }

    if (group) {
      const { count } = await (supabase.from("hacker_group_members") as any)
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);

      let userRole: "owner" | "member" | null = null;
      let isMember = false;

      if (userId) {
        const { data: member } = await (supabase.from("hacker_group_members") as any)
          .select("role")
          .eq("group_id", group.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (member) {
          userRole = member.role;
          isMember = true;
        }
      }

      const isGate = group.visibility === "private" && !isMember;

      return {
        group: {
          ...group,
          member_count: count || 0,
          user_role: userRole,
          is_member: isMember,
        },
        canonicalSlug,
        isGate,
      };
    }
  } catch {
    // Database connection fallback
  }

  // Demo fallback
  let demo = DEMO_GROUPS.find((g) => g.slug === slug);
  let canonicalSlug: string | undefined;

  if (!demo) {
    demo = DEMO_GROUPS.find((g) => g.slug_history?.includes(slug));
    if (demo) {
      canonicalSlug = demo.slug;
    }
  }

  if (demo) {
    const isMember = userId
      ? demo.created_by === userId || demo.is_member
      : false;
    const isGate = demo.visibility === "private" && !isMember;

    return {
      group: {
        ...demo,
        is_member: isMember,
      },
      canonicalSlug,
      isGate,
    };
  }

  return { group: null };
}

/**
 * Creates an invite for a hacker group (verifying owner role).
 */
export async function createInvite(params: {
  groupId: string;
  ownerId: string;
  githubUsername?: string | null;
  multiUse?: boolean;
}): Promise<{ token: string; invite_url: string; multi_use: boolean }> {
  const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const multiUse = params.multiUse ?? true;

  try {
    const supabase = await createClient();

    // Verify owner
    const { data: group } = await (supabase.from("hacker_groups") as any)
      .select("created_by")
      .eq("id", params.groupId)
      .maybeSingle();

    const { data: member } = await (supabase.from("hacker_group_members") as any)
      .select("role")
      .eq("group_id", params.groupId)
      .eq("user_id", params.ownerId)
      .eq("role", "owner")
      .maybeSingle();

    if (group?.created_by !== params.ownerId && !member) {
      throw new Error("Forbidden: Only owners can generate invite links");
    }

    const { error } = await (supabase.from("hacker_group_invites") as any).insert({
      group_id: params.groupId,
      token,
      github_username: params.githubUsername || null,
      created_by: params.ownerId,
      multi_use: multiUse,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Forbidden")) throw err;
  }

  DEMO_INVITES[token] = {
    group_id: params.groupId,
    token,
    multi_use: multiUse,
    github_username: params.githubUsername || null,
  };

  return {
    token,
    invite_url: inviteUrl(token),
    multi_use: multiUse,
  };
}

export const createGroupInvite = (
  groupId: string,
  userId: string,
  githubUsername?: string | null
) =>
  createInvite({
    groupId,
    ownerId: userId,
    githubUsername,
    multiUse: true,
  });

/**
 * Adds a user to a group via invite token.
 */
export async function joinGroupByToken(
  paramsOrToken: { userId: string; token: string } | string,
  maybeUserId?: string
): Promise<{ success: boolean; groupSlug: string; groupId?: string }> {
  const userId = typeof paramsOrToken === "string" ? maybeUserId! : paramsOrToken.userId;
  const token = typeof paramsOrToken === "string" ? paramsOrToken : paramsOrToken.token;

  try {
    const supabase = await createClient();

    const { data: invite, error: inviteErr } = await (supabase.from("hacker_group_invites") as any)
      .select("*, hacker_groups(id, slug)")
      .eq("token", token)
      .maybeSingle();

    if (inviteErr || !invite || !invite.hacker_groups) {
      throw new Error("Invalid or expired invite token");
    }

    if (!invite.multi_use && invite.used_at) {
      throw new Error("This invite token has already been used");
    }

    if (invite.github_username) {
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("github_username")
        .eq("id", userId)
        .maybeSingle();

      if (
        !profile?.github_username ||
        profile.github_username.toLowerCase() !== invite.github_username.toLowerCase()
      ) {
        throw new Error(`This invite is reserved for @${invite.github_username}`);
      }
    }

    const groupId = invite.hacker_groups.id;
    const groupSlug = invite.hacker_groups.slug;

    // Check if already a member
    const { data: existingMember } = await (supabase.from("hacker_group_members") as any)
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      await (supabase.from("hacker_group_members") as any).insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });
    }

    if (!invite.multi_use) {
      await (supabase.from("hacker_group_invites") as any)
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
    }

    return { success: true, groupSlug, groupId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Invalid") || message.includes("already been used") || message.includes("reserved")) {
      throw err;
    }
  }

  // Demo fallback
  const demoInvite = DEMO_INVITES[token];
  if (!demoInvite) {
    const firstGroup = DEMO_GROUPS[0];
    if (token.startsWith("inv-") && firstGroup) {
      return { success: true, groupSlug: firstGroup.slug, groupId: firstGroup.id };
    }
    throw new Error("Invalid or expired invite token");
  }

  if (!demoInvite.multi_use && demoInvite.used_at) {
    throw new Error("This invite token has already been used");
  }

  const group = DEMO_GROUPS.find((g) => g.id === demoInvite.group_id);
  if (!group) {
    throw new Error("Target hacker group not found");
  }

  group.is_member = true;
  group.member_count += 1;
  if (!demoInvite.multi_use) {
    demoInvite.used_at = new Date().toISOString();
  }

  return { success: true, groupSlug: group.slug, groupId: group.id };
}

/**
 * Adds a member to a group by GitHub username.
 */
export async function addMemberByGithubUsername(params: {
  groupId: string;
  ownerId: string;
  githubUsername: string;
}): Promise<{ success: boolean; memberId: string; githubUsername: string }> {
  const targetUsername = params.githubUsername.trim().replace(/^@/, "");

  try {
    const supabase = await createClient();

    // Verify owner
    const { data: member } = await (supabase.from("hacker_group_members") as any)
      .select("role")
      .eq("group_id", params.groupId)
      .eq("user_id", params.ownerId)
      .eq("role", "owner")
      .maybeSingle();

    if (!member) {
      throw new Error("Forbidden: Only owners can add members directly");
    }

    // Find profile
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("id, github_username")
      .ilike("github_username", targetUsername)
      .maybeSingle();

    if (!profile) {
      throw new Error(`User with GitHub username @${targetUsername} not found on Pholio`);
    }

    // Add to group
    await (supabase.from("hacker_group_members") as any).upsert({
      group_id: params.groupId,
      user_id: profile.id,
      role: "member",
    });

    return { success: true, memberId: profile.id, githubUsername: targetUsername };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Forbidden") || message.includes("not found")) throw err;
  }

  return {
    success: true,
    memberId: `user-${Date.now()}`,
    githubUsername: targetUsername,
  };
}

/**
 * Lists members of a group with calculated activity scores, sorted desc.
 */
export async function listGroupMembers(params: {
  groupId: string;
}): Promise<LeaderboardMember[]> {
  const { groupId } = params;

  try {
    const supabase = await createClient();

    const { data: members, error } = await (supabase.from("hacker_group_members") as any)
      .select("user_id, role, joined_at")
      .eq("group_id", groupId);

    if (!error && members && members.length > 0) {
      const userIds = members.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await (supabase.from("profiles") as any)
        .select("id, display_name, slug, avatar_url")
        .in("id", userIds);

      // Fetch snapshot for deltas
      const { data: snapshot } = await (supabase.from("leaderboard_snapshots") as any)
        .select("rankings")
        .eq("group_id", groupId)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousRankings: Record<string, number> = {};
      if (snapshot && Array.isArray(snapshot.rankings)) {
        snapshot.rankings.forEach((r: any, idx: number) => {
          if (r.user_id) previousRankings[r.user_id] = idx + 1;
        });
      }

      const weekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();

      const leaderboard: LeaderboardMember[] = await Promise.all(
        members.map(async (m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.user_id);

          const { count: pushesCount } = await (supabase.from("github_sync_events") as any)
            .select("*", { count: "exact", head: true })
            .eq("user_id", m.user_id)
            .gte("created_at", weekAgo);

          const { count: showcasesCount } = await (supabase.from("showcases") as any)
            .select("*", { count: "exact", head: true })
            .eq("owner_id", m.user_id)
            .gte("published_at", weekAgo);

          const { data: latestProj } = await (supabase.from("projects") as any)
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
            previous_rank: previousRankings[m.user_id] ?? null,
            delta: computeRankDelta(1, null),
          };
        })
      );

      // Sort descending by score, tiebreak by showcases, pushes
      leaderboard.sort((a, b) => {
        if (b.activity_score !== a.activity_score) {
          return b.activity_score - a.activity_score;
        }
        if (b.showcases_7d !== a.showcases_7d) {
          return b.showcases_7d - a.showcases_7d;
        }
        return b.pushes_7d - a.pushes_7d;
      });

      leaderboard.forEach((m, idx) => {
        m.current_rank = idx + 1;
        m.delta = computeRankDelta(m.current_rank, m.previous_rank);
      });

      return leaderboard;
    }
  } catch {
    // Database fallback
  }

  return DEMO_MEMBERS[groupId] || [];
}

export const getGroupLeaderboard = (groupId: string) =>
  listGroupMembers({ groupId });

/**
 * Returns all groups a user belongs to.
 */
export async function listGroupsForUser(
  userId: string
): Promise<HackerGroupWithMeta[]> {
  try {
    const supabase = await createClient();

    const { data: memberRows, error: memberErr } = await (supabase.from("hacker_group_members") as any)
      .select("group_id, role")
      .eq("user_id", userId);

    if (!memberErr && memberRows && memberRows.length > 0) {
      const groupIds = memberRows.map((m: { group_id: string }) => m.group_id);
      const { data: groups, error: groupErr } = await (supabase.from("hacker_groups") as any)
        .select("*")
        .in("id", groupIds);

      if (!groupErr && groups) {
        const enriched = await Promise.all(
          groups.map(async (g: HackerGroupRow) => {
            const { count } = await (supabase.from("hacker_group_members") as any)
              .select("*", { count: "exact", head: true })
              .eq("group_id", g.id);

            const mRow = memberRows.find((m: { group_id: string }) => m.group_id === g.id);
            return {
              ...g,
              member_count: count || 1,
              user_role: mRow ? mRow.role : null,
              is_member: true,
            };
          })
        );
        return enriched;
      }
    }
  } catch {
    // Database connection fallback
  }

  return DEMO_GROUPS;
}

export const listUserGroups = listGroupsForUser;

/**
 * Leaves group or removes member. Owner can remove anyone; member can remove self.
 */
export async function leaveOrRemoveMember(params: {
  groupId: string;
  requesterId: string;
  targetUserId: string;
}): Promise<{ success: boolean }> {
  const isSelf = params.requesterId === params.targetUserId;

  try {
    const supabase = await createClient();

    if (!isSelf) {
      // Must be owner
      const { data: member } = await (supabase.from("hacker_group_members") as any)
        .select("role")
        .eq("group_id", params.groupId)
        .eq("user_id", params.requesterId)
        .eq("role", "owner")
        .maybeSingle();

      if (!member) {
        throw new Error("Forbidden: Only group owners can remove members");
      }
    }

    const { error } = await (supabase.from("hacker_group_members") as any)
      .delete()
      .eq("group_id", params.groupId)
      .eq("user_id", params.targetUserId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Forbidden")) throw err;
  }

  // Demo fallback
  if (DEMO_MEMBERS[params.groupId]) {
    DEMO_MEMBERS[params.groupId] = DEMO_MEMBERS[params.groupId].filter(
      (m) => m.user_id !== params.targetUserId
    );
  }

  return { success: true };
}

/**
 * Retrieves recent peer activities (showcases & pushes) within the group.
 */
export async function getGroupPeerFeed(groupId: string): Promise<PeerActivityItem[]> {
  try {
    const supabase = await createClient();

    const { data: members } = await (supabase.from("hacker_group_members") as any)
      .select("user_id")
      .eq("group_id", groupId);

    if (members && members.length > 0) {
      const userIds = members.map((m: { user_id: string }) => m.user_id);

      const { data: profiles } = await (supabase.from("profiles") as any)
        .select("id, display_name, slug, avatar_url")
        .in("id", userIds);

      const profileMap = new Map<string, { id: string; display_name?: string | null; slug?: string; avatar_url?: string | null }>(
        profiles?.map((p: any) => [p.id, p]) ?? []
      );

      const { data: recentShowcases } = await (supabase.from("showcases") as any)
        .select("id, owner_id, body, published_at")
        .in("owner_id", userIds)
        .order("published_at", { ascending: false })
        .limit(10);

      const { data: recentPushes } = await (supabase.from("github_sync_events") as any)
        .select("id, user_id, event_type, commit_sha, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(10);

      const feed: PeerActivityItem[] = [];

      recentShowcases?.forEach((s: any) => {
        const p = profileMap.get(s.owner_id);
        feed.push({
          id: `showcase-${s.id}`,
          type: "showcase",
          user_name: p?.display_name || p?.slug || "Hacker",
          user_slug: p?.slug || "user",
          avatar_url: p?.avatar_url || null,
          message: `Published showcase update: ${s.body.slice(0, 100)}${s.body.length > 100 ? "..." : ""}`,
          timestamp: s.published_at,
        });
      });

      recentPushes?.forEach((push: any) => {
        const p = profileMap.get(push.user_id);
        feed.push({
          id: `push-${push.id}`,
          type: "push",
          user_name: p?.display_name || p?.slug || "Hacker",
          user_slug: p?.slug || "user",
          avatar_url: p?.avatar_url || null,
          message: "Pushed updates to repository",
          timestamp: push.created_at,
        });
      });

      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return feed.slice(0, 15);
    }
  } catch {
    // Fallback
  }

  return DEMO_ACTIVITIES[groupId] || [];
}

/**
 * Validates invite token.
 */
export async function getInviteByToken(token: string): Promise<{
  valid: boolean;
  group_name?: string;
  group_slug?: string;
  group_id?: string;
  visibility?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: invite } = await (supabase.from("hacker_group_invites") as any)
      .select("*, hacker_groups(id, name, slug, visibility)")
      .eq("token", token)
      .maybeSingle();

    if (invite && invite.hacker_groups) {
      return {
        valid: true,
        group_id: invite.hacker_groups.id,
        group_name: invite.hacker_groups.name,
        group_slug: invite.hacker_groups.slug,
        visibility: invite.hacker_groups.visibility,
      };
    }
  } catch {
    // Fallback
  }

  const demoInvite = DEMO_INVITES[token];
  if (demoInvite) {
    const group = DEMO_GROUPS.find((g) => g.id === demoInvite.group_id);
    if (group) {
      return {
        valid: true,
        group_id: group.id,
        group_name: group.name,
        group_slug: group.slug,
        visibility: group.visibility,
      };
    }
  }

  return { valid: false };
}
