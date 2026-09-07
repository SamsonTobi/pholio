import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Showcase = Database["public"]["Tables"]["showcases"]["Row"];
type Mockup = Database["public"]["Tables"]["mockups"]["Row"];

export interface EnrichedProject extends Project {
  mockup?: Mockup | null;
  latestShowcases?: Showcase[];
}

export async function listProjectsByOwner(ownerId: string): Promise<EnrichedProject[]> {
  try {
    const supabase = await createClient();
    const { data: projects } = (await (supabase.from("projects") as any)
      .select("*")
      .eq("owner_id", ownerId)
      .order("last_push_at", { ascending: false })) as { data: Project[] | null };

    if (projects && projects.length > 0) {
      return projects.map((p) => ({
        ...p,
        mockup: null,
        latestShowcases: [],
      }));
    }
  } catch {
    // Fallback
  }

  // Demo fallback projects
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
      live_url: "https://pholio.dev",
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

export async function getProjectById(
  id: string,
  ownerId: string = "00000000-0000-0000-0000-000000000001"
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

  const projects = await listProjectsByOwner(ownerId);
  return projects.find((p) => p.id === id) || null;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project | null> {
  try {
    const supabase = await createClient();
    const { data, error } = (await (supabase.from("projects") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single()) as { data: Project | null; error: { message: string } | null };

    if (error) throw new Error(error.message);
    if (data) return data;
  } catch {
    // Database fallback
  }

  const demoProject = (await listProjectsByOwner("00000000-0000-0000-0000-000000000001")).find(
    (p) => p.id === id
  );

  if (demoProject) {
    Object.assign(demoProject, updates);
    return demoProject;
  }

  return null;
}

