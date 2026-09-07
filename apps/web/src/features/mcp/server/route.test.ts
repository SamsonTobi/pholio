import { describe, it, expect, beforeEach } from "vitest";
import { POST, OPTIONS } from "@/app/api/mcp/route";
import { NextRequest } from "next/server";
import {
  generateApiKey,
  resetInMemoryApiKeys,
  revokeApiKey,
} from "@/features/agent-keys/server/service";

describe("MCP HTTP Route (/api/mcp)", () => {
  let validKey: { token: string; id: string; userId?: string };

  beforeEach(async () => {
    resetInMemoryApiKeys();
    const generated = await generateApiKey({
      userId: "00000000-0000-0000-0000-000000000001",
      name: "MCP Route Test Agent",
    });
    validKey = generated;
  });

  it("handles CORS OPTIONS preflight", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("returns 401 on missing or invalid Bearer token", async () => {
    // 1. Missing Authorization header
    const reqMissing = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 101,
        method: "initialize",
      }),
    });
    const resMissing = await POST(reqMissing);
    expect(resMissing.status).toBe(401);
    const dataMissing = await resMissing.json();
    expect(dataMissing).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized: Invalid or revoked API key",
      },
      id: 101,
    });

    // 2. Invalid token
    const reqInvalid = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_secret_token",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 102,
        method: "initialize",
      }),
    });
    const resInvalid = await POST(reqInvalid);
    expect(resInvalid.status).toBe(401);
    const dataInvalid = await resInvalid.json();
    expect(dataInvalid.error.code).toBe(-32000);
    expect(dataInvalid.id).toBe(102);

    // 3. Revoked token
    await revokeApiKey({
      keyId: validKey.id,
      userId: "00000000-0000-0000-0000-000000000001",
    });
    const reqRevoked = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 103,
        method: "initialize",
      }),
    });
    const resRevoked = await POST(reqRevoked);
    expect(resRevoked.status).toBe(401);
    const dataRevoked = await resRevoked.json();
    expect(dataRevoked.error.code).toBe(-32000);
    expect(dataRevoked.id).toBe(103);
  });

  it("handles JSON-RPC initialize method", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(1);
    expect(data.result).toBeDefined();
    expect(data.result.serverInfo).toEqual({
      name: "pholio-mcp",
      version: "1.0.0",
    });
    expect(data.result.capabilities).toEqual({
      tools: {},
    });
  });

  it("handles notifications/initialized method", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "notifications/initialized",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(2);
    expect(data.result).toEqual({});
  });

  it("handles tools/list method and returns definitions for all tools", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(3);

    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("update_project");
    expect(toolNames).toContain("publish_showcase");
    expect(toolNames).toContain("sync_readme");
    expect(toolNames).toContain("upload_mockup");
    expect(toolNames).toContain("get_stats");
    expect(toolNames).toContain("get_leaderboard");

    for (const tool of data.result.tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("handles tools/call publish_showcase and verifies source is 'agent'", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "publish_showcase",
          arguments: {
            project_slug: "pholio",
            body: "Shipped automated MCP server integration and verified agent key flow.",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(4);
    expect(data.result.content).toBeDefined();
    expect(data.result.content[0].type).toBe("text");

    const payload = JSON.parse(data.result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.showcase).toBeDefined();
    expect(payload.showcase.source).toBe("agent");
    expect(payload.showcase.body).toBe(
      "Shipped automated MCP server integration and verified agent key flow."
    );
  });

  it("handles tools/call get_stats", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "get_stats",
          arguments: {
            project_slug: "pholio",
            days: 7,
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(5);
    expect(data.result.content[0].type).toBe("text");

    const stats = JSON.parse(data.result.content[0].text);
    expect(stats.days).toHaveLength(7);
    expect(stats.totals).toBeDefined();
    expect(typeof stats.totals.visitors_7d).toBe("number");
    expect(typeof stats.totals.actives_7d).toBe("number");
  });

  it("handles tools/call update_project", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validKey.token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "update_project",
          arguments: {
            project_slug: "pholio",
            summary: "Next-gen living developer showcase updated by MCP tool handler.",
            tags: ["TypeScript", "Next.js", "MCP", "AI"],
            live_url: "https://pholio.dev",
            status: "active",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(6);
    expect(data.result.content[0].type).toBe("text");

    const result = JSON.parse(data.result.content[0].text);
    expect(result.success).toBe(true);
    expect(result.project).toBeDefined();
    expect(result.project.readme_summary).toBe(
      "Next-gen living developer showcase updated by MCP tool handler."
    );
    expect(result.project.tags).toContain("MCP");
  });
});
