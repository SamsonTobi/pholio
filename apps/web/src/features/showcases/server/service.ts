import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Database } from "@/lib/supabase/types";

const LIVE = () =>
  Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

export type Showcase = Database["public"]["Tables"]["showcases"]["Row"];
export type ShowcaseSource = "github" | "agent" | "manual";

export interface PublishShowcaseParams {
  ownerId: string;
  projectId: string;
  body: string;
  source?: ShowcaseSource;
  isPinned?: boolean;
  meta?: Record<string, unknown>;
}

export interface UpdateShowcaseParams {
  id: string;
  ownerId: string;
  body?: string;
  isPinned?: boolean;
  meta?: Record<string, unknown>;
}

export interface RemoveShowcaseParams {
  id: string;
  ownerId: string;
}

export function resolveShowcaseMeta(
  meta?: Record<string, unknown>,
  isPinned?: boolean
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(meta ?? {}) };
  if (isPinned !== undefined) {
    result.pinned = isPinned;
  }
  return result;
}

/** Rethrow live-backend failures instead of serving demo rows in production. */
function rethrowIfLive(err: unknown): void {
  if (LIVE()) {
    throw err instanceof Error ? err : new Error("Service unavailable");
  }
}

const isProd = () => process.env.NODE_ENV === "production" || LIVE();

let DEMO_SHOWCASES: Showcase[] = [
  {
    id: "s1",
    project_id: "p1",
    owner_id: "00000000-0000-0000-0000-000000000001",
    body: "Launched hacker groups and scheduled digest crons with growth spike notifications.",
    meta: { pinned: true },
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    source: "manual",
  },
  {
    id: "s2",
    project_id: "p2",
    owner_id: "00000000-0000-0000-0000-000000000001",
    body: "Automated sports wagering ML model predictions with capital management.",
    meta: {},
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    source: "manual",
  },
];

// Overload 1: object parameter { ownerId, projectId, body, source, isPinned, meta }
export async function publishShowcase(params: PublishShowcaseParams): Promise<Showcase>;
// Overload 2: (ownerId, input)
export async function publishShowcase(
  ownerId: string,
  input: {
    project_id: string;
    body: string;
    source?: ShowcaseSource;
    pinned?: boolean;
    is_pinned?: boolean;
    meta?: Record<string, unknown>;
  }
): Promise<Showcase>;
export async function publishShowcase(
  paramsOrOwnerId: PublishShowcaseParams | string,
  secondArg?: {
    project_id: string;
    body: string;
    source?: ShowcaseSource;
    pinned?: boolean;
    is_pinned?: boolean;
    meta?: Record<string, unknown>;
  }
): Promise<Showcase> {
  let ownerId: string;
  let projectId: string;
  let body: string;
  let source: ShowcaseSource = "manual";
  let isPinned: boolean | undefined;
  let meta: Record<string, unknown> | undefined;

  if (typeof paramsOrOwnerId === "string") {
    ownerId = paramsOrOwnerId;
    projectId = secondArg!.project_id;
    body = secondArg!.body;
    source = secondArg!.source || "manual";
    isPinned = secondArg!.pinned ?? secondArg!.is_pinned;
    meta = secondArg!.meta;
  } else {
    ownerId = paramsOrOwnerId.ownerId;
    projectId = paramsOrOwnerId.projectId;
    body = paramsOrOwnerId.body;
    source = paramsOrOwnerId.source || "manual";
    isPinned = paramsOrOwnerId.isPinned;
    meta = paramsOrOwnerId.meta;
  }

  const resolvedMeta = resolveShowcaseMeta(meta, isPinned ? true : undefined);

  // Offline demo path first: never touch the network without a linked backend
  // (admin queries stall for seconds against an unreachable host).
  if (!LIVE()) {
    return publishDemoShowcase({ ownerId, projectId, body, source, isPinned, resolvedMeta });
  }

  // Live path. Ownership is verified in code with an explicit owner_id scope;
  // the admin client also serves cookieless MCP callers. RLS remains as a
  // second layer for direct table access.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: project, error: projectError } = (await (supabase
    .from("projects") as any)
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle()) as { data: { id: string } | null; error: unknown };

  if (projectError || !project) {
    const { data: exists } = (await (supabase.from("projects") as any)
      .select("id")
      .eq("id", projectId)
      .maybeSingle()) as { data: { id: string } | null };
    throw new Error(exists ? "Forbidden" : "Project not found");
  }

  if (isPinned) {
    // Unpin existing showcases for this owner
    const { data: existingPinned } = await (supabase.from("showcases") as any)
      .select("id, meta")
      .eq("owner_id", ownerId)
      .contains("meta", { pinned: true });

    if (existingPinned && existingPinned.length > 0) {
      await Promise.all(
        existingPinned.map((s: { id: string; meta: Record<string, unknown> }) =>
          (supabase.from("showcases") as any)
            .update({
              meta: { ...(s.meta || {}), pinned: false },
            })
            .eq("id", s.id)
        )
      );
    }
  }

  const { data, error } = await (supabase.from("showcases") as any)
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      body,
      source,
      meta: resolvedMeta,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as Showcase;
  }
  throw new Error("Publish failed");
}

function publishDemoShowcase({
  ownerId,
  projectId,
  body,
  source,
  isPinned,
  resolvedMeta,
}: {
  ownerId: string;
  projectId: string;
  body: string;
  source: ShowcaseSource;
  isPinned: boolean | undefined;
  resolvedMeta: Record<string, unknown>;
}): Showcase {
  // Offline demo fallback (no linked backend only — never in production,
  // which always takes the live path above).
  if (isPinned) {
    DEMO_SHOWCASES = DEMO_SHOWCASES.map((s) => {
      if (s.owner_id === ownerId) {
        const m = (s.meta as Record<string, unknown>) || {};
        return { ...s, meta: { ...m, pinned: false } };
      }
      return s;
    });
  }

  const demoShowcase: Showcase = {
    id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    project_id: projectId,
    owner_id: ownerId,
    body,
    source,
    meta: resolvedMeta as any,
    published_at: new Date().toISOString(),
  };

  DEMO_SHOWCASES.unshift(demoShowcase);
  return demoShowcase;
}

export async function updateShowcase({
  id,
  ownerId,
  body,
  isPinned,
  meta,
}: UpdateShowcaseParams): Promise<Showcase> {
  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      if (existing.owner_id !== ownerId) {
        throw new Error("Unauthorized to update this showcase");
      }

      const updates: Record<string, unknown> = {};

      if (body !== undefined) {
        updates.body = body;
      }

      if (meta !== undefined || isPinned !== undefined) {
        const existingMeta = (existing.meta as Record<string, unknown>) || {};
        const mergedMeta = { ...existingMeta, ...(meta ?? {}) };
        updates.meta = resolveShowcaseMeta(mergedMeta, isPinned);
      }

      const { data: updated, error: updateError } = await (supabase.from("showcases") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return updated as Showcase;
    }
  } catch (err: any) {
    if (err?.message?.includes("Unauthorized")) {
      throw err;
    }
    rethrowIfLive(err);
  }

  if (isProd()) {
    throw new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only)
  const demo = DEMO_SHOWCASES.find((s) => s.id === id);
  if (demo) {
    if (demo.owner_id !== ownerId) {
      throw new Error("Unauthorized to update this showcase");
    }
    if (body !== undefined) {
      demo.body = body;
    }
    const existingMeta = (demo.meta as Record<string, unknown>) || {};
    const mergedMeta = { ...existingMeta, ...(meta ?? {}) };
    demo.meta = resolveShowcaseMeta(mergedMeta, isPinned) as any;
    return demo;
  }

  throw new Error("Showcase not found");
}

export async function togglePinShowcase(
  id: string,
  ownerId: string
): Promise<Showcase | null> {
  try {
    const supabase = await createClient();
    const { data: existing } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      if (existing.owner_id !== ownerId) {
        throw new Error("Unauthorized");
      }
      const currentPinned = (existing.meta as Record<string, unknown>)?.pinned === true;
      return updateShowcase({
        id,
        ownerId,
        isPinned: !currentPinned,
      });
    }
  } catch (err: any) {
    if (err?.message?.includes("Unauthorized")) {
      throw err;
    }
    rethrowIfLive(err);
  }

  if (isProd()) {
    throw new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only)
  const demo = DEMO_SHOWCASES.find((s) => s.id === id);
  if (demo) {
    if (demo.owner_id !== ownerId) {
      throw new Error("Unauthorized");
    }
    const currentPinned = (demo.meta as Record<string, unknown>)?.pinned === true;
    demo.meta = {
      ...((demo.meta as Record<string, unknown>) || {}),
      pinned: !currentPinned,
    } as any;
    return demo;
  }

  return null;
}

export async function removeShowcase({
  id,
  ownerId,
}: RemoveShowcaseParams): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await (supabase.from("showcases") as any)
      .select("id, owner_id")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      if (existing.owner_id !== ownerId) {
        throw new Error("Unauthorized to delete this showcase");
      }

      const { error: deleteError } = await (supabase.from("showcases") as any)
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return true;
    }
  } catch (err: any) {
    if (err?.message?.includes("Unauthorized")) {
      throw err;
    }
    rethrowIfLive(err);
  }

  if (isProd()) {
    throw new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only)
  const idx = DEMO_SHOWCASES.findIndex((s) => s.id === id);
  if (idx !== -1) {
    if (DEMO_SHOWCASES[idx].owner_id !== ownerId) {
      throw new Error("Unauthorized to delete this showcase");
    }
    DEMO_SHOWCASES.splice(idx, 1);
    return true;
  }

  throw new Error("Showcase not found");
}

export async function listShowcasesByProject(projectId: string): Promise<Showcase[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("project_id", projectId)
      .order("published_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Authoritative answer (possibly empty) — never fabricate rows.
    return (data || []) as Showcase[];
  } catch (err) {
    rethrowIfLive(err);
  }

  if (isProd()) return [];

  // Offline demo fallback (dev/test only)
  return DEMO_SHOWCASES.filter((s) => s.project_id === projectId).sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function listShowcasesByOwner(ownerId: string): Promise<Showcase[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .order("published_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Authoritative answer (possibly empty) — never fabricate rows.
    return (data || []) as Showcase[];
  } catch (err) {
    rethrowIfLive(err);
  }

  if (isProd()) return [];

  // Offline demo fallback (dev/test only)
  return DEMO_SHOWCASES.filter((s) => s.owner_id === ownerId).sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getLatestPinnedShowcase(ownerId: string): Promise<Showcase | null> {
  try {
    const supabase = await createClient();

    // Look for showcase where meta->pinned = true
    const { data: pinned } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .contains("meta", { pinned: true })
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pinned) {
      return pinned as Showcase;
    }

    // Fallback to latest published showcase
    const { data: latest } = await (supabase.from("showcases") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      return latest as Showcase;
    }
    return null;
  } catch (err) {
    rethrowIfLive(err);
  }

  if (isProd()) return null;

  // Offline demo fallback (dev/test only)
  const ownerShowcases = DEMO_SHOWCASES.filter((s) => s.owner_id === ownerId).sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  const pinned = ownerShowcases.find(
    (s) => (s.meta as Record<string, unknown>)?.pinned === true
  );

  if (pinned) return pinned;
  return ownerShowcases[0] || null;
}
