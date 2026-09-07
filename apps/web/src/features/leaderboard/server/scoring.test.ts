import { describe, it, expect } from "vitest";
import {
  PUSH_WEIGHT,
  SHOWCASE_WEIGHT,
  RECENCY_UNDER_24H,
  RECENCY_UNDER_72H,
  computeRecencyBonus,
  computeActivityScore,
  computeRankDelta,
} from "./scoring";

describe("Leaderboard scoring logic", () => {
  const baseTime = new Date("2026-09-07T12:00:00Z");

  describe("Weights and Constants", () => {
    it("exports the expected scoring weights and constants", () => {
      expect(PUSH_WEIGHT).toBe(10);
      expect(SHOWCASE_WEIGHT).toBe(15);
      expect(RECENCY_UNDER_24H).toBe(5);
      expect(RECENCY_UNDER_72H).toBe(2);
    });
  });

  describe("Recency bonus calculation", () => {
    it("returns RECENCY_UNDER_24H (5) when last push is within 24 hours", () => {
      const tenHoursAgo = new Date(baseTime.getTime() - 10 * 60 * 60 * 1000).toISOString();
      expect(computeRecencyBonus(tenHoursAgo, baseTime)).toBe(5);

      const twentyThreeHoursAgo = new Date(baseTime.getTime() - 23 * 60 * 60 * 1000).toISOString();
      expect(computeRecencyBonus(twentyThreeHoursAgo, baseTime)).toBe(5);
    });

    it("returns RECENCY_UNDER_72H (2) when last push is between 24 and 72 hours", () => {
      const thirtyHoursAgo = new Date(baseTime.getTime() - 30 * 60 * 60 * 1000).toISOString();
      expect(computeRecencyBonus(thirtyHoursAgo, baseTime)).toBe(2);

      const seventyHoursAgo = new Date(baseTime.getTime() - 70 * 60 * 60 * 1000).toISOString();
      expect(computeRecencyBonus(seventyHoursAgo, baseTime)).toBe(2);
    });

    it("returns 0 when last push is older than 72 hours", () => {
      const fourDaysAgo = new Date(baseTime.getTime() - 96 * 60 * 60 * 1000).toISOString();
      expect(computeRecencyBonus(fourDaysAgo, baseTime)).toBe(0);
    });

    it("returns 0 for null, undefined, or invalid timestamp", () => {
      expect(computeRecencyBonus(null, baseTime)).toBe(0);
      expect(computeRecencyBonus(undefined, baseTime)).toBe(0);
      expect(computeRecencyBonus("not-a-valid-date", baseTime)).toBe(0);
    });
  });

  describe("Activity score calculation", () => {
    it("calculates score correctly with pushes, showcases, and recent bonus", () => {
      // 3 pushes * 10 = 30, 2 showcases * 15 = 30, push 5h ago = 5 => 65
      const fiveHoursAgo = new Date(baseTime.getTime() - 5 * 60 * 60 * 1000).toISOString();
      const score = computeActivityScore(
        {
          pushes7d: 3,
          showcases7d: 2,
          lastPushAt: fiveHoursAgo,
        },
        baseTime
      );
      expect(score).toBe(3 * 10 + 2 * 15 + 5);
      expect(score).toBe(65);
    });

    it("calculates score correctly with zero pushes and zero showcases", () => {
      const score = computeActivityScore({
        pushes7d: 0,
        showcases7d: 0,
        lastPushAt: null,
      });
      expect(score).toBe(0);
    });

    it("calculates score correctly with medium recency bonus (+2)", () => {
      const twoDaysAgo = new Date(baseTime.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const score = computeActivityScore(
        {
          pushes7d: 4,
          showcases7d: 1,
          lastPushAt: twoDaysAgo,
        },
        baseTime
      );
      // 4 * 10 + 1 * 15 + 2 = 57
      expect(score).toBe(57);
    });
  });

  describe("Rank delta calculation", () => {
    it("detects movement up the leaderboard", () => {
      // Moved from rank 5 to rank 2: delta = 3, direction = 'up'
      const delta = computeRankDelta(2, 5);
      expect(delta).toEqual({ delta: 3, direction: "up" });
    });

    it("detects movement down the leaderboard", () => {
      // Dropped from rank 1 to rank 4: delta = 3, direction = 'down'
      const delta = computeRankDelta(4, 1);
      expect(delta).toEqual({ delta: 3, direction: "down" });
    });

    it("detects unchanged rank position", () => {
      // Remains at rank 3: delta = 0, direction = 'same'
      const delta = computeRankDelta(3, 3);
      expect(delta).toEqual({ delta: 0, direction: "same" });
    });

    it("handles new member with null or undefined previous rank", () => {
      expect(computeRankDelta(1, null)).toEqual({ delta: 0, direction: "same" });
      expect(computeRankDelta(5, null)).toEqual({ delta: 0, direction: "same" });
    });
  });
});
