import { describe, it, expect } from "vitest";
import { getBySlug } from "./service";
import { changeSlugSchema } from "./schema";
import { showcaseUrl } from "@/lib/env";

describe("profile service & slug handling", () => {
  it("validates slug with strict character rules (lowercase, numbers, hyphens, 3..30)", () => {
    expect(changeSlugSchema.safeParse({ slug: "valid-slug" }).success).toBe(true);
    expect(changeSlugSchema.safeParse({ slug: "123" }).success).toBe(true);
    expect(changeSlugSchema.safeParse({ slug: "ab" }).success).toBe(false); // too short
    expect(changeSlugSchema.safeParse({ slug: "Invalid_Slug!" }).success).toBe(false); // bad chars
  });

  it("finds profile by active slug", async () => {
    const res = await getBySlug("tobi");
    expect(res.profile).toBeDefined();
    expect(res.profile?.slug).toBe("tobi");
    expect(res.canonicalSlug).toBeUndefined();
  });

  it("resolves historic slug to canonical slug for 301 redirection", async () => {
    const res = await getBySlug("samsontobi");
    expect(res.profile).toBeDefined();
    expect(res.canonicalSlug).toBe("tobi");
  });

  it("returns null for non-existent slugs", async () => {
    const res = await getBySlug("non-existent-user-12345");
    expect(res.profile).toBeNull();
  });

  it("builds canonical showcaseUrl using environment", () => {
    expect(showcaseUrl("tobi")).toContain("/tobi");
    expect(showcaseUrl("siddharth")).toContain("/siddharth");
  });
});
