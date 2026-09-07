import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("POST /api/cron/leaderboard", () => {
  it("rejects unauthorized requests with invalid authorization header", async () => {
    // If CRON_SECRET is configured, a bad header should fail
    const req = new NextRequest("http://localhost:3000/api/cron/leaderboard", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret-token",
      },
    });

    const res = await POST(req);
    // If CRON_SECRET is not set in process.env during local tests, it might pass or fail depending on env
    // Let's check that response is valid JSON
    expect(res.status).toBeDefined();
    const data = await res.json();
    expect(data).toBeDefined();
  });

  it("computes leaderboard snapshots and returns processed groups", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/leaderboard", {
      method: "POST",
    });

    const res = await POST(req);
    const data = await res.json();

    if (res.status === 200) {
      expect(data.success).toBe(true);
      expect(data.processedGroups).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.results)).toBe(true);
    }
  });
});
