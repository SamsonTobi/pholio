import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  RateLimiter,
  checkRateLimit,
  resetRateLimit,
} from "./rate-limit";
import { ingestSchema, statsQuerySchema } from "./schema";
import {
  ingestEvent,
  getStats,
  hasEvents,
  resetMockEvents,
} from "./service";
import { POST as ingestPost, OPTIONS as ingestOptions } from "@/app/api/ingest/route";
import { GET as statsGet, OPTIONS as statsOptions } from "@/app/api/stats/route";

describe("Telemetry Feature", () => {
  beforeEach(() => {
    resetRateLimit();
    resetMockEvents();
  });

  describe("Rate limiter", () => {
    it("allows up to 60 requests in a 60-second window and blocks the 61st with positive retryAfter", () => {
      const ip = "192.168.1.100";
      const now = 1_000_000;

      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(ip, now + i * 100);
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeUndefined();
      }

      // 61st request within the same 60-second window
      const blocked = checkRateLimit(ip, now + 6000);
      expect(blocked.allowed).toBe(false);
      expect(typeof blocked.retryAfter).toBe("number");
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    });

    it("tracks different IPs independently", () => {
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";
      const now = 2_000_000;

      for (let i = 0; i < 60; i++) {
        checkRateLimit(ipA, now);
      }

      expect(checkRateLimit(ipA, now).allowed).toBe(false);
      expect(checkRateLimit(ipB, now).allowed).toBe(true);
    });

    it("allows requests after window slides past", () => {
      const ip = "10.0.0.3";
      const now = 3_000_000;

      for (let i = 0; i < 60; i++) {
        checkRateLimit(ip, now);
      }
      expect(checkRateLimit(ip, now).allowed).toBe(false);

      // Advance time by 61 seconds (61,000 ms)
      const later = now + 61_000;
      const result = checkRateLimit(ip, later);
      expect(result.allowed).toBe(true);
    });

    it("enforces memory bounds when maxKeys is reached", () => {
      const limiter = new RateLimiter({ limit: 5, windowMs: 10_000, maxKeys: 10 });
      const now = 4_000_000;

      for (let i = 0; i < 15; i++) {
        limiter.check(`ip-${i}`, now);
      }

      // Eviction occurs when maxKeys is exceeded
      limiter.cleanup(now);
      const res = limiter.check("ip-fresh", now);
      expect(res.allowed).toBe(true);
    });
  });

  describe("Ingest schema validation", () => {
    it("accepts valid telemetry payload and applies default path '/'", () => {
      const parsed = ingestSchema.safeParse({
        telemetry_slug: "my-telemetry-app",
        session_hash: "sess_hash_12345678",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.telemetry_slug).toBe("my-telemetry-app");
        expect(parsed.data.session_hash).toBe("sess_hash_12345678");
        expect(parsed.data.path).toBe("/");
      }
    });

    it("accepts custom path", () => {
      const parsed = ingestSchema.safeParse({
        telemetry_slug: "my-telemetry-app",
        session_hash: "sess_hash_12345678",
        path: "/blog/post-1",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.path).toBe("/blog/post-1");
      }
    });

    it("rejects telemetry_slug shorter than 3 characters or longer than 64 characters", () => {
      expect(
        ingestSchema.safeParse({
          telemetry_slug: "ab",
          session_hash: "valid-session-hash",
        }).success
      ).toBe(false);

      expect(
        ingestSchema.safeParse({
          telemetry_slug: "a".repeat(65),
          session_hash: "valid-session-hash",
        }).success
      ).toBe(false);
    });

    it("rejects session_hash shorter than 3 characters or longer than 128 characters", () => {
      expect(
        ingestSchema.safeParse({
          telemetry_slug: "valid-slug",
          session_hash: "12",
        }).success
      ).toBe(false);

      expect(
        ingestSchema.safeParse({
          telemetry_slug: "valid-slug",
          session_hash: "s".repeat(129),
        }).success
      ).toBe(false);
    });

    it("rejects path exceeding 500 characters", () => {
      expect(
        ingestSchema.safeParse({
          telemetry_slug: "valid-slug",
          session_hash: "valid-session",
          path: "/" + "x".repeat(501),
        }).success
      ).toBe(false);
    });

    it("rejects payload missing telemetry_slug or session_hash", () => {
      expect(
        ingestSchema.safeParse({
          session_hash: "valid-session",
        }).success
      ).toBe(false);

      expect(
        ingestSchema.safeParse({
          telemetry_slug: "valid-slug",
        }).success
      ).toBe(false);
    });
  });

  describe("Stats schema and calculations", () => {
    it("validates valid project_slug and defaults days to 7", () => {
      const parsed = statsQuerySchema.safeParse({
        project_slug: "pholio",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.project_slug).toBe("pholio");
        expect(parsed.data.days).toBe(7);
      }
    });

    it("preprocesses telemetry_slug to project_slug when project_slug is absent", () => {
      const parsed = statsQuerySchema.safeParse({
        telemetry_slug: "custom-telemetry",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.project_slug).toBe("custom-telemetry");
        expect(parsed.data.days).toBe(7);
      }
    });

    it("coerces string days and clamps within 1..30", () => {
      const valid14 = statsQuerySchema.safeParse({
        project_slug: "bankroll",
        days: "14",
      });
      expect(valid14.success).toBe(true);
      if (valid14.success) {
        expect(valid14.data.days).toBe(14);
      }

      // Reject days < 1
      const invalidZero = statsQuerySchema.safeParse({
        project_slug: "bankroll",
        days: 0,
      });
      expect(invalidZero.success).toBe(false);

      // Reject days > 30
      const invalid31 = statsQuerySchema.safeParse({
        project_slug: "bankroll",
        days: 31,
      });
      expect(invalid31.success).toBe(false);
    });

    it("rejects empty project_slug", () => {
      expect(
        statsQuerySchema.safeParse({
          project_slug: "",
        }).success
      ).toBe(false);
    });

    it("returns expected shape and deterministic data for getStats", async () => {
      const stats = await getStats({ projectSlug: "pholio", days: 7 });

      expect(stats).toHaveProperty("days");
      expect(stats).toHaveProperty("totals");
      expect(Array.isArray(stats.days)).toBe(true);
      expect(stats.days.length).toBe(7);

      for (const day of stats.days) {
        expect(typeof day.day).toBe("string");
        expect(typeof day.visitors).toBe("number");
        expect(typeof day.actives_7d).toBe("number");
        expect(day.visitors).toBeGreaterThanOrEqual(0);
        expect(day.actives_7d).toBeGreaterThanOrEqual(0);
      }

      expect(typeof stats.totals.visitors_7d).toBe("number");
      expect(typeof stats.totals.actives_7d).toBe("number");
      expect(stats.totals.visitors_7d).toBeGreaterThan(0);
      expect(stats.totals.actives_7d).toBeGreaterThan(0);
      // Offline deterministic fallback must be explicitly marked demo
      expect(stats.demo).toBe(true);

      // Deterministic output: calling again yields identical result
      const statsAgain = await getStats({ projectSlug: "pholio", days: 7 });
      expect(statsAgain).toEqual(stats);
    });

    it("respects custom days parameter in getStats", async () => {
      const stats14 = await getStats({ projectSlug: "bankroll", days: 14 });
      expect(stats14.days.length).toBe(14);
    });
  });

  describe("Service functions: ingestEvent and hasEvents", () => {
    it("successfully ingests an event and updates hasEvents", async () => {
      const testSlug = "custom-tracker-test";
      expect(await hasEvents(testSlug)).toBe(false);

      const success = await ingestEvent({
        telemetrySlug: testSlug,
        sessionHash: "session-xyz-12345",
        path: "/dashboard",
      });

      expect(success).toBe(true);
      expect(await hasEvents(testSlug)).toBe(true);
    });

    it("supports snake_case parameters in ingestEvent", async () => {
      const testSlug = "snake-case-test";
      const success = await ingestEvent({
        telemetry_slug: testSlug,
        session_hash: "session-snake-987",
        path: "/docs",
      });

      expect(success).toBe(true);
      expect(await hasEvents(testSlug)).toBe(true);
    });

    it("rejects ingestEvent when required fields are missing", async () => {
      const failNoSlug = await ingestEvent({
        sessionHash: "sess-123",
      });
      expect(failNoSlug).toBe(false);

      const failNoHash = await ingestEvent({
        telemetrySlug: "slug-123",
      });
      expect(failNoHash).toBe(false);
    });

    it("no longer fabricates events for unknown slugs in hasEvents", async () => {
      expect(await hasEvents("pholio-demo")).toBe(false);
      expect(await hasEvents("bankroll-demo")).toBe(false);
    });
  });

  describe("API Endpoints", () => {
    describe("POST /api/ingest", () => {
      it("accepts valid request and returns 200 with { ok: true }", async () => {
        const req = new NextRequest("http://localhost:3000/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.195",
          },
          body: JSON.stringify({
            telemetry_slug: "test-project-123",
            session_hash: "hash_abc_12345",
            path: "/home",
          }),
        });

        const res = await ingestPost(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toEqual({ ok: true });
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      });

      it("returns 400 Bad Request for invalid payload", async () => {
        const req = new NextRequest("http://localhost:3000/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.196",
          },
          body: JSON.stringify({
            telemetry_slug: "ab", // Too short
          }),
        });

        const res = await ingestPost(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data).toEqual({ error: "Invalid payload" });
      });

      it("returns 429 Too Many Requests when rate limit exceeded", async () => {
        const rateLimitIp = "198.51.100.42";

        for (let i = 0; i < 60; i++) {
          const req = new NextRequest("http://localhost:3000/api/ingest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": rateLimitIp,
            },
            body: JSON.stringify({
              telemetry_slug: "rate-limit-slug",
              // Unique session per request so the IP limiter (not the
              // per-session throttle) is what binds here.
              session_hash: `hash_123456_${i}`,
            }),
          });
          const okRes = await ingestPost(req);
          expect(okRes.status).toBe(200);
        }

        // 61st request should be rate limited
        const req61 = new NextRequest("http://localhost:3000/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": rateLimitIp,
          },
          body: JSON.stringify({
            telemetry_slug: "rate-limit-slug",
            session_hash: "hash_123456_final",
          }),
        });

        const res429 = await ingestPost(req61);
        expect(res429.status).toBe(429);
        expect(res429.headers.get("Retry-After")).toBeDefined();

        const data = await res429.json();
        expect(data).toEqual({ error: "Rate limit exceeded" });
      });

      it("returns 429 when a single session exceeds its own throttle", async () => {
        const sessionHash = "throttled-session-abc";
        for (let i = 0; i < 30; i++) {
          const req = new NextRequest("http://localhost:3000/api/ingest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": `203.0.113.${100 + i}`,
            },
            body: JSON.stringify({
              telemetry_slug: "session-throttle-slug",
              session_hash: sessionHash,
            }),
          });
          const res = await ingestPost(req);
          expect(res.status).toBe(200);
        }

        const blocked = new NextRequest("http://localhost:3000/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.200",
          },
          body: JSON.stringify({
            telemetry_slug: "session-throttle-slug",
            session_hash: sessionHash,
          }),
        });
        const resBlocked = await ingestPost(blocked);
        expect(resBlocked.status).toBe(429);
      });

      it("handles CORS OPTIONS preflight request", async () => {
        const res = await ingestOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      });
    });

    describe("GET /api/stats", () => {
      it("returns 200 and stats shape for valid project_slug", async () => {
        const req = new NextRequest(
          "http://localhost:3000/api/stats?project_slug=pholio&days=7"
        );

        const res = await statsGet(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty("days");
        expect(data).toHaveProperty("totals");
        expect(data.days.length).toBe(7);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      });

      it("supports telemetry_slug query parameter", async () => {
        const req = new NextRequest(
          "http://localhost:3000/api/stats?telemetry_slug=bankroll&days=14"
        );

        const res = await statsGet(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.days.length).toBe(14);
      });

      it("returns 400 when project_slug is missing", async () => {
        const req = new NextRequest("http://localhost:3000/api/stats?days=7");
        const res = await statsGet(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data).toEqual({ error: "Invalid query parameters" });
      });

      it("handles CORS OPTIONS preflight request", async () => {
        const res = await statsOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
      });
    });
  });
});
