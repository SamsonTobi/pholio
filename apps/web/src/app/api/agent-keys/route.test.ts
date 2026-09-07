import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST, DELETE } from "./route";
import { NextRequest } from "next/server";
import { resetInMemoryApiKeys } from "@/features/agent-keys/server/service";

describe("Agent Keys API Route (/api/agent-keys)", () => {
  beforeEach(() => {
    resetInMemoryApiKeys();
  });

  it("POST /api/agent-keys generates a key with plaintext token", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Coding Agent",
        scopes: ["showcase:write"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.token).toMatch(/^pholio_live_[0-9a-f]{8}_[0-9a-f]{32}$/);
    expect(data.prefix).toMatch(/^pholio_live_[0-9a-f]{8}$/);
    expect(data.name).toBe("Test Coding Agent");
    expect(data.scopes).toEqual(["showcase:write"]);
    expect(data.id).toBeDefined();
  });

  it("GET /api/agent-keys returns the list of keys for authenticated user", async () => {
    // Generate two keys first
    const req1 = new NextRequest("http://localhost:3000/api/agent-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Key 1" }),
    });
    await POST(req1);

    const req2 = new NextRequest("http://localhost:3000/api/agent-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Key 2" }),
    });
    await POST(req2);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.keys)).toBe(true);
    expect(data.keys.length).toBeGreaterThanOrEqual(2);
    // Sensitive token field should not be in listed keys
    expect(data.keys[0].token).toBeUndefined();
    expect(data.keys[0].prefix).toBeDefined();
  });

  it("DELETE /api/agent-keys revokes a key by query id", async () => {
    const postReq = new NextRequest("http://localhost:3000/api/agent-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Key to revoke" }),
    });
    const postRes = await POST(postReq);
    const postData = await postRes.json();
    const keyId = postData.id;

    const delReq = new NextRequest(`http://localhost:3000/api/agent-keys?id=${keyId}`, {
      method: "DELETE",
    });
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);

    // Verify key shows revoked_at in list
    const getRes = await GET();
    const getData = await getRes.json();
    const revokedKey = getData.keys.find((k: any) => k.id === keyId);
    expect(revokedKey?.revoked_at).not.toBeNull();
  });

  it("DELETE /api/agent-keys rejects missing id query parameter", async () => {
    const delReq = new NextRequest("http://localhost:3000/api/agent-keys", {
      method: "DELETE",
    });
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(400);
    const delData = await delRes.json();
    expect(delData.error).toContain("id is required");
  });
});
