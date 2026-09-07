import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";

vi.mock("@/features/auth/server/service", () => ({
  getSessionUser: vi.fn(),
  requireUser: vi.fn(),
}));

const mockUser = { id: "test-user-id", email: "test@example.com" };

describe("Hacker groups API route", () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as any);
  });

  it("GET /api/hacker-groups returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/hacker-groups returns list of user groups", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.groups)).toBe(true);
    expect(data.groups.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/hacker-groups rejects invalid slug or short name", async () => {
    const req = new NextRequest("http://localhost:3000/api/hacker-groups", {
      method: "POST",
      body: JSON.stringify({
        name: "X", // too short (min 2)
        slug: "invalid_slug_with_underscore",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/hacker-groups creates group with valid input", async () => {
    const slug = `api-test-${Date.now()}`;
    const req = new NextRequest("http://localhost:3000/api/hacker-groups", {
      method: "POST",
      body: JSON.stringify({
        name: "Valid API Group",
        slug,
        visibility: "public",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.group).toBeDefined();
    expect(data.group.name).toBe("Valid API Group");
    expect(data.group.slug).toBe(slug);
  });
});
