import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { listUserRepos, GitHubRepoItem } from "@/lib/github";
import { parseReadmeContent } from "./readme";
import { resolveProjectIcon } from "./icons";
import { Database } from "@/lib/supabase/types";
import crypto from "node:crypto";

type Project = Database["public"]["Tables"]["projects"]["Row"];

function generateTelemetrySlug(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 16);
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").substring(0, 6);
  return `${clean}-${randomSuffix}`;
}

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

export interface SyncRepoInput {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  private?: boolean;
  fork?: boolean;
  archived?: boolean;
  topics?: string[];
  owner?: {
    avatar_url?: string;
  } | null;
}

function buildProjectPayload(userId: string, repo: SyncRepoInput) {
  const parsed = parseReadmeContent(
    `# ${repo.name}\n\n${repo.description || "A product built with passion."}\n\nLive: ${repo.homepage || ""}\n\nBuilt with ${repo.language || "TypeScript"}`
  );

  const icon = resolveProjectIcon({
    repoRootFiles: ["package.json"],
    liveUrl: repo.homepage || undefined,
    ownerAvatarUrl: repo.owner?.avatar_url,
    githubRepoId: repo.id,
  });

  const telemetrySlug = generateTelemetrySlug(repo.name);
  const showcaseSlug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return {
    owner_id: userId,
    github_repo_id: repo.id,
    github_full_name: repo.full_name,
    name: repo.name,
    showcase_slug: showcaseSlug,
    description: repo.description,
    readme_summary: parsed.summary,
    icon_url: icon.url,
    tags: parsed.tags.length > 0 ? parsed.tags : [repo.language || "TypeScript"],
    language: repo.language,
    stars: repo.stargazers_count,
    live_url: repo.homepage || repo.html_url,
    status: "active" as const,
    last_push_at: repo.pushed_at,
    telemetry_slug: telemetrySlug,
  };
}

/**
 * Shared creation path — used by manual import, webhook auto-import, and
 * any future caller. Same README summary, icon, telemetry slug, initial
 * showcase draft, and sync event every time.
 */
export async function upsertProjectFromRepo(
  userId: string,
  repo: SyncRepoInput,
  eventType: "import" | "push" | "release" = "import",
  client?: Awaited<ReturnType<typeof createClient>>
): Promise<Project | null> {
  const supabase = client ?? (await createClient());
  const projectPayload = buildProjectPayload(userId, repo);

  // Preserve the existing telemetry_slug on re-import: it is the stable
  // key for raw_events/daily_stats. Only new projects get a fresh slug.
  const { data: existing } = await (supabase.from("projects") as any)
    .select("id, telemetry_slug")
    .eq("owner_id", userId)
    .eq("github_repo_id", repo.id)
    .maybeSingle();

  const { data: project, error } = await (supabase.from("projects") as any)
    .upsert(
      existing?.telemetry_slug
        ? { ...projectPayload, telemetry_slug: existing.telemetry_slug }
        : projectPayload,
      { onConflict: "owner_id,github_repo_id" }
    )
    .select()
    .single();

  if (error || !project) return null;

  // Initial showcase draft only on first import (no github-source
  // showcase yet) — re-imports must not duplicate it.
  const { data: priorDraft } = await (supabase.from("showcases") as any)
    .select("id")
    .eq("project_id", project.id)
    .eq("source", "github")
    .limit(1)
    .maybeSingle();

  if (!priorDraft) {
    await (supabase.from("showcases") as any).insert({
      project_id: project.id,
      owner_id: userId,
      body: `Initial import of ${project.name} from GitHub. ${project.description || ""}`.trim().substring(0, 600),
      source: "github",
    });
  }

  await (supabase.from("github_sync_events") as any).insert({
    project_id: project.id,
    owner_id: userId,
    event_type: eventType,
    pushed_at: repo.pushed_at,
  });

  return project as Project;
}

export async function listImportableRepos(token?: string | null): Promise<GitHubRepoItem[]> {
  const repos = await listUserRepos(token);
  return repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => {
      const pushA = new Date(a.pushed_at).getTime();
      const pushB = new Date(b.pushed_at).getTime();
      if (Number.isNaN(pushA) && Number.isNaN(pushB)) return 0;
      if (Number.isNaN(pushA)) return 1;
      if (Number.isNaN(pushB)) return -1;
      if (pushB !== pushA) return pushB - pushA;
      return b.stargazers_count - a.stargazers_count;
    });
}

export async function importRepos(
  userId: string,
  repoFullNames: string[],
  token?: string | null
): Promise<Project[]> {
  const repos = await listImportableRepos(token);
  const selectedRepos = repos.filter((r) => repoFullNames.includes(r.full_name));

  const supabase = await createClient();
  const createdProjects: Project[] = [];

  for (const repo of selectedRepos) {
    try {
      const project = await upsertProjectFromRepo(userId, repo, "import", supabase);
      if (project) createdProjects.push(project);
    } catch (err) {
      // Per-repo failure: surface on live backends, tolerate offline.
      if (isSupabaseLive()) throw err instanceof Error ? err : new Error("Import failed");
    }
  }

  return createdProjects;
}

export async function reparseProject(projectId: string, userId: string): Promise<boolean> {
  // Offline fast path: never hit the network without a linked backend.
  if (!isSupabaseLive()) return true;
  // Admin client: ownership is verified in code below (this path also serves
  // cookieless MCP callers). RLS remains for direct table access.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  try {
    const { data: project } = await (supabase.from("projects") as any)
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) return false;

    if (project.owner_id !== userId) {
      throw new Error("Forbidden: you do not own this project");
    }

    await (supabase.from("projects") as any)
      .update({
        last_push_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    await (supabase.from("github_sync_events") as any).insert({
      project_id: projectId,
      owner_id: project.owner_id,
      event_type: "manual",
      pushed_at: new Date().toISOString(),
    });

    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Forbidden")) {
      throw err;
    }
    return false;
  }
}
