import { createClient } from "@/lib/supabase/server";
import { ProfileUpdateInput } from "./schema";
import { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Fallback demo profile for local preview when DB is not linked
const DEMO_PROFILES: Record<string, Profile> = {
  tobi: {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "tobi",
    github_username: "SamsonTobi",
    github_id: 123456,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    display_name: "Tobi Samson",
    headline: "Product engineer",
    site_url: "https://samsontobi.dev",
    template: "story",
    slug_history: ["samsontobi"],
    created_at: new Date().toISOString(),
  },
  siddharth: {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "siddharth",
    github_username: "siddhartharun",
    github_id: 234567,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    display_name: "Siddharth Arun",
    headline: "Designer & full-stack builder",
    site_url: "https://siddharth.me",
    template: "index",
    slug_history: [],
    created_at: new Date().toISOString(),
  },
};

export async function getBySlug(slug: string): Promise<{
  profile: Profile | null;
  canonicalSlug?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: profile } = (await (supabase.from("profiles") as any)
      .select("*")
      .eq("slug", slug)
      .maybeSingle()) as { data: Profile | null };

    if (profile) {
      return { profile };
    }

    // Check slug_history
    const { data: historic } = (await (supabase.from("profiles") as any)
      .select("*")
      .contains("slug_history", [slug])
      .maybeSingle()) as { data: Profile | null };

    if (historic) {
      return { profile: historic, canonicalSlug: historic.slug };
    }
  } catch {
    // Database connection fallback
  }

  // Local demo fallback
  if (DEMO_PROFILES[slug]) {
    return { profile: DEMO_PROFILES[slug] };
  }

  for (const p of Object.values(DEMO_PROFILES)) {
    if (p.slug_history?.includes(slug)) {
      return { profile: p, canonicalSlug: p.slug };
    }
  }

  return { profile: null };
}

export async function getById(id: string): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const { data } = (await (supabase.from("profiles") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle()) as { data: Profile | null };

    if (data) return data;
  } catch {
    // Fallback
  }

  return Object.values(DEMO_PROFILES).find((p) => p.id === id) || null;
}

export async function updateProfile(id: string, input: ProfileUpdateInput): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = (await (supabase.from("profiles") as any)
    .update(input)
    .eq("id", id)
    .select()
    .single()) as { data: Profile | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  return data;
}

export async function changeSlug(id: string, newSlug: string): Promise<Profile | null> {
  const supabase = await createClient();

  // Check uniqueness
  const { data: existing } = (await (supabase.from("profiles") as any)
    .select("id")
    .eq("slug", newSlug)
    .maybeSingle()) as { data: { id: string } | null };

  if (existing && existing.id !== id) {
    throw new Error("Slug is already taken");
  }

  const { data, error } = (await (supabase.from("profiles") as any)
    .update({ slug: newSlug })
    .eq("id", id)
    .select()
    .single()) as { data: Profile | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  return data;
}

export async function setTemplate(id: string, template: "story" | "index"): Promise<Profile | null> {
  return updateProfile(id, { template });
}
