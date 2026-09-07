import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ProfileUpdateInput } from "./schema";
import { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

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
    bio_previously: "Co-founded Paystack mobile, earlier at Konga engineering.",
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
    bio_previously: "Design engineer at Linear, previously built interfaces at Stripe.",
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

  // Local demo fallback (no linked backend only — never with live config)
  if (isSupabaseLive()) {
    return { profile: null };
  }
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
    // Fallback below (dev/test only)
  }

  if (isSupabaseLive()) return null;
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

  // Read current slug so the old one is preserved in slug_history in the
  // same update (old URLs keep 301-redirecting via getBySlug).
  const { data: current } = (await (supabase.from("profiles") as any)
    .select("slug, slug_history")
    .eq("id", id)
    .maybeSingle()) as {
    data: { slug: string; slug_history: string[] | null } | null;
  };

  if (!current) throw new Error("Profile not found");

  const history = current.slug_history || [];
  const nextHistory =
    current.slug !== newSlug && !history.includes(current.slug)
      ? [...history, current.slug]
      : history;

  const { data, error } = (await (supabase.from("profiles") as any)
    .update({ slug: newSlug, slug_history: nextHistory })
    .eq("id", id)
    .select()
    .single()) as { data: Profile | null; error: { message: string; code?: string } | null };

  if (error) {
    if ((error as { code?: string }).code === "23505" || error.message.includes("duplicate")) {
      throw new Error("Slug is already taken");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function setTemplate(id: string, template: "story" | "index"): Promise<Profile | null> {
  return updateProfile(id, { template });
}
