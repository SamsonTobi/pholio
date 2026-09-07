import { describe, it, expect } from "vitest";
import {
  computeLeaderboard,
  getLeaderboardSnapshot,
} from "./service";

describe("Leaderboard service", () => {
  it("computes leaderboard rankings and detects activity spikes", async () => {
    const res = await computeLeaderboard("g1");

    expect(res.group_id).toBe("g1");
    expect(res.day).toBeDefined();
    expect(res.rankings.length).toBeGreaterThan(0);
    expect(res.rankings[0].current_rank).toBe(1);
    expect(res.actives_7d).toBeGreaterThan(0);

    // In demo data: g1 had 2 active members 48h ago, and now has 3 active members (50% increase >= 40%)
    expect(res.spike_detected).toBe(true);
    expect(res.growth_percent).toBeGreaterThanOrEqual(40);
  });

  it("retrieves snapshot comparison with yesterday for a group slug", async () => {
    const res = await getLeaderboardSnapshot("lagos-hackers");

    expect(res.group).not.toBeNull();
    expect(res.rankings.length).toBeGreaterThan(0);
    expect(res.actives_7d).toBeGreaterThan(0);
    expect(res.yesterday_snapshot).toBeDefined();

    if (res.yesterday_snapshot) {
      expect(res.yesterday_snapshot.rankings.length).toBeGreaterThan(0);
    }
  });

  it("returns null group for non-existent slug", async () => {
    const res = await getLeaderboardSnapshot("non-existent-group-slug-xyz");
    expect(res.group).toBeNull();
    expect(res.rankings).toEqual([]);
  });
});
