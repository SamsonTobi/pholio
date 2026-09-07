import { describe, it, expect } from "vitest";
import {
  createShowcaseSchema,
  updateShowcaseSchema,
  showcaseCreateSchema,
} from "./schema";
import {
  publishShowcase,
  listShowcasesByOwner,
  togglePinShowcase,
  updateShowcase,
  resolveShowcaseMeta,
} from "./service";

describe("Showcases feature", () => {
  const validProjectId = "550e8400-e29b-41d4-a716-446655440000";
  const validShowcaseId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

  describe("Body length validation", () => {
    it("rejects body less than 10 characters", () => {
      const result = showcaseCreateSchema.safeParse({
        project_id: "p1",
        body: "Short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least 10 characters");
      }
    });

    it("rejects body exceeding 600 characters", () => {
      const longBody = "a".repeat(601);
      const result = showcaseCreateSchema.safeParse({
        project_id: "p1",
        body: longBody,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("cannot exceed 600 characters");
      }
    });

    it("accepts valid body between 10 and 600 characters", () => {
      const result = showcaseCreateSchema.safeParse({
        project_id: "p1",
        body: "Shipped the new dashboard features today with mockups and composer.",
      });
      expect(result.success).toBe(true);

      const exact10 = showcaseCreateSchema.safeParse({
        project_id: "p1",
        body: "1234567890",
      });
      expect(exact10.success).toBe(true);

      const exact600 = showcaseCreateSchema.safeParse({
        project_id: "p1",
        body: "x".repeat(600),
      });
      expect(exact600.success).toBe(true);
    });

    it("validates body length on updateShowcaseSchema when body is provided", () => {
      expect(
        updateShowcaseSchema.safeParse({ id: validShowcaseId, body: "Short" }).success
      ).toBe(false);
      expect(
        updateShowcaseSchema.safeParse({ id: validShowcaseId, body: "a".repeat(601) }).success
      ).toBe(false);
      expect(
        updateShowcaseSchema.safeParse({
          id: validShowcaseId,
          body: "A valid updated showcase description.",
        }).success
      ).toBe(true);
    });
  });

  describe("Pin logic", () => {
    const ownerId = "00000000-0000-0000-0000-000000000001";

    it("unpins existing showcases when a new one is published with pinned=true", async () => {
      const showcase = await publishShowcase(ownerId, {
        project_id: "p1",
        body: "A brand new update that is pinned directly to the Now section.",
        pinned: true,
      });

      expect(showcase.meta).toEqual(expect.objectContaining({ pinned: true }));

      const all = await listShowcasesByOwner(ownerId);
      const otherPinned = all.filter(
        (s) => s.id !== showcase.id && (s.meta as any)?.pinned
      );
      expect(otherPinned.length).toBe(0);
    });

    it("toggles pin status correctly", async () => {
      const showcase = await publishShowcase(ownerId, {
        project_id: "p2",
        body: "Testing toggle pin status on this newly published update item.",
        pinned: false,
      });

      const pinned = await togglePinShowcase(showcase.id, ownerId);
      expect((pinned?.meta as any)?.pinned).toBe(true);

      const unpinned = await togglePinShowcase(showcase.id, ownerId);
      expect((unpinned?.meta as any)?.pinned).toBe(false);
    });

    it("supports unpinning via updateShowcase", async () => {
      const showcase = await publishShowcase({
        ownerId,
        projectId: "p1",
        body: "Showcase created with isPinned set to true for verification.",
        isPinned: true,
      });
      expect((showcase.meta as any)?.pinned).toBe(true);

      const updated = await updateShowcase({
        id: showcase.id,
        ownerId,
        isPinned: false,
      });
      expect((updated.meta as any)?.pinned).toBe(false);
    });

    it("resolves showcase meta accurately for pinning and unpinning", () => {
      expect(resolveShowcaseMeta({ tags: ["dev"] }, true)).toEqual({
        tags: ["dev"],
        pinned: true,
      });
      expect(resolveShowcaseMeta({ pinned: true }, false)).toEqual({
        pinned: false,
      });
    });
  });

  describe("Source enum validation", () => {
    it("accepts valid sources: github, agent, and manual", () => {
      const validSources = ["github", "agent", "manual"] as const;
      for (const source of validSources) {
        const res = createShowcaseSchema.safeParse({
          project_id: validProjectId,
          body: "Testing valid source enum values in schema.",
          source,
        });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.source).toBe(source);
        }
      }
    });

    it("defaults source to manual when omitted", () => {
      const res = createShowcaseSchema.safeParse({
        project_id: validProjectId,
        body: "Testing default source value in schema.",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.source).toBe("manual");
      }
    });

    it("rejects invalid sources", () => {
      const invalidSources = ["twitter", "webhook", "discord", "bot"];
      for (const source of invalidSources) {
        const res = createShowcaseSchema.safeParse({
          project_id: validProjectId,
          body: "Testing invalid source values in schema.",
          source,
        });
        expect(res.success).toBe(false);
      }
    });
  });
});
