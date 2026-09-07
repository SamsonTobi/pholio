import { createClient } from "@/lib/supabase/server";
import { listUserRepos, GitHubRepoItem } from "@/lib/github";
import { parseReadmeContent } from "./readme";
import { resolveProjectIcon } from "./icons";
import { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

function generateTelemetrySlug(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 16);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${clean}-${randomSuffix}`;
}

export async function listImportableRepos(token?: string | null): Promise<GitHubRepoItem[]> {
  const repos = await listUserRepos(token);
  return repos.sort((a, b) => {
    const pushA = new Date(a.pushed_at).getTime();
    const pushB = new Date(b.pushed_at).getTime();
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

    const projectPayload = {
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

    try {
      const { data: project } = await (supabase.from("projects") as any)
        .upsert(projectPayload, { onConflict: "owner_id,github_repo_id" })
        .select()
        .single();

      if (project) {
        createdProjects.push(project);

        // Create initial showcase draft marked source=github
        await (supabase.from("showcases") as any).insert({
          project_id: project.id,
          owner_id: userId,
          body: `Initial import of ${project.name} from GitHub. ${project.description || ""}`.trim().substring(0, 600),
          source: "github",
        });

        // Insert sync event
        await (supabase.from("github_sync_events") as any).insert({
          project_id: project.id,
          owner_id: userId,
          event_type: "import",
          pushed_at: repo.pushed_at,
        });
      }
    } catch {
      // Allow preview fallback in dev
    }
  }

  return createdProjects;
}

export async function reparseProject(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { data: project } = await (supabase.from("projects") as any)
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) return false;

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
  } catch {
    return false;
  }
}
