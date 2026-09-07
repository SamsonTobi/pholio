import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Showcase = Database["public"]["Tables"]["showcases"]["Row"];
type Mockup = Database["public"]["Tables"]["mockups"]["Row"];

export interface EnrichedProject extends Project {
  mockup?: Mockup | null;
  latestShowcases?: Showcase[];
}

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

export async function listProjectsByOwner(ownerId: string): Promise<EnrichedProject[]> {
  try {
    const supabase = await createClient();
    const { data: projects, error } = (await (supabase.from("projects") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .order("last_push_at", { ascending: false })) as {
      data: Project[] | null;
      error: unknown;
    };

    if (!error) {
      // Authoritative answer (possibly empty) — never fabricate rows.
      return (projects || []).map((p) => ({
        ...p,
        mockup: null,
        latestShowcases: [],
      }));
    }
  } catch {
    // DB unreachable — offline demo fallback below (dev/test only)
  }

  if (isSupabaseLive()) return [];

  // Offline demo fallback (dev/test without a linked backend only)
  return [
    {
      id: "p1",
      owner_id: ownerId,
      github_repo_id: 101,
      github_full_name: "SamsonTobi/pholio",
      name: "Pholio",
      showcase_slug: "pholio",
      description: "Self-maintaining showcase for product builders",
      readme_summary: "Automated living showcase for product builders. Connect GitHub once, showcase projects, and measure visitor pulse automatically with coding agent support.",
      icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=pholio",
      tags: ["Next.js", "TypeScript", "Tailwind CSS"],
      language: "TypeScript",
      stars: 142,
      live_url: "https://pholio.cc",
      status: "active",
      last_push_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      telemetry_slug: "pholio-demo",
      created_at: new Date().toISOString(),
      mockup: {
        id: "m1",
        project_id: "p1",
        storage_path: "",
        device: "browser",
        sort: 0,
      },
      latestShowcases: [
        {
          id: "s1",
          project_id: "p1",
          owner_id: ownerId,
          body: "Launched hacker groups and scheduled digest crons with growth spike notifications.",
          meta: {},
          published_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          source: "manual",
        },
      ],
    },
    {
      id: "p2",
      owner_id: ownerId,
      github_repo_id: 102,
      github_full_name: "SamsonTobi/bankroll",
      name: "Bankroll",
      showcase_slug: "bankroll",
      description: "Sports wagering and capital management mobile application",
      readme_summary: "Automated ML prediction engine with multi-leg wagering baskets and risk management built with React Native and Expo.",
      icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=bankroll",
      tags: ["React Native", "Expo", "FastAPI"],
      language: "TypeScript",
      stars: 88,
      live_url: "https://bankroll.ng",
      status: "active",
      last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      telemetry_slug: "bankroll-demo",
      created_at: new Date().toISOString(),
      mockup: {
        id: "m2",
        project_id: "p2",
        storage_path: "",
        device: "phone",
        sort: 0,
      },
      latestShowcases: [],
    },
  ];
}

export async function getProjectBySlug(
  ownerId: string,
  projectSlug: string
): Promise<EnrichedProject | null> {
  const projects = await listProjectsByOwner(ownerId);
  return projects.find((p) => p.showcase_slug === projectSlug) || null;
}

/**
 * Owner-scoped slug lookup via the admin client (explicit owner_id filter).
 * For cookieless callers (MCP) where no session RLS context exists.
 */
export async function getProjectBySlugAsOwner(
  ownerId: string,
  projectSlug: string
): Promise<EnrichedProject | null> {
  // Offline fast path: never hit the network without a linked backend.
  if (!isSupabaseLive()) {
    return getProjectBySlug(ownerId, projectSlug);
  }
  try {
    const admin = createAdminClient();
    const { data, error } = (await (admin.from("projects") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .eq("showcase_slug", projectSlug)
      .maybeSingle()) as { data: Project | null; error: unknown };
    if (!error && data) {
      return { ...data, mockup: null, latestShowcases: [] };
    }
  } catch {
    // Fall through to session-scoped lookup
  }
  return getProjectBySlug(ownerId, projectSlug);
}

export async function getProjectById(
  id: string,
  ownerId?: string
): Promise<EnrichedProject | null> {
  try {
    const supabase = await createClient();
    const { data } = (await (supabase.from("projects") as any)
      .select("*")
      .eq("id", id)
      .single()) as { data: Project | null };

    if (data) {
      return {
        ...data,
        mockup: null,
        latestShowcases: [],
      };
    }
  } catch {
    // Database fallback
  }

  const projects = await listProjectsByOwner(ownerId ?? "");
  const found = projects.find((p) => p.id === id) || null;
  if (found || ownerId || isSupabaseLive()) return found;

  // Offline demo lookup without an owner: scan the local demo owners.
  for (const demoOwner of ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]) {
    const hit = (await listProjectsByOwner(demoOwner)).find((p) => p.id === id);
    if (hit) return hit;
  }
  return null;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>,
  ownerId: string
): Promise<Project | null> {
  if (!ownerId?.trim()) throw new Error("ownerId is required");
  // Whitelist: sync-owned columns (stars, language, last_push_at, icon_url,
  // github_full_name, github_repo_id) are managed by github-sync, never here.
  const ALLOWED_UPDATE_KEYS = new Set([    "name",
    "description",
    "readme_summary",
    "tags",
    "live_url",
    "status",
  ]);
  const safeUpdates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED_UPDATE_KEYS.has(k)) safeUpdates[k] = v;
  }

  // Offline fast path: never hit the network without a linked backend
  // (admin queries stall for seconds against an unreachable host).
  if (!isSupabaseLive()) {
    const demoProject = (await listProjectsByOwner(ownerId)).find((p) => p.id === id);
    if (demoProject) {
      Object.assign(demoProject, safeUpdates);
      return demoProject;
    }
    return null;
  }
  // Admin client: ownership is enforced by the explicit owner_id filter
  // below (this path also serves cookieless MCP callers). RLS remains as a
  // second layer for direct table access.
  const supabase = createAdminClient();
  try {
    let q = (supabase.from("projects") as any).update(safeUpdates).eq("id", id).eq("owner_id", ownerId);
    const { data, error } = (await q.select().single()) as {
      data: Project | null;
      error: { message: string } | null;
    };

    if (!error && data) return data;
    if (error) {
      // Distinguish owner mismatch from missing row for a clean 403.
      const { data: exists } = (await (supabase.from("projects") as any)
        .select("id")
        .eq("id", id)
        .maybeSingle()) as { data: { id: string } | null };
      if (exists) throw new Error("Forbidden");
      throw new Error(error.message);
    }
    throw new Error("Update failed");
  } catch (e) {
    if (e instanceof Error && (e.message === "Forbidden" || e.message === "Update failed")) throw e;
    throw new Error("Service unavailable");
  }
}

