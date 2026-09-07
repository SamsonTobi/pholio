import { describe, it, expect } from "vitest";
import { MCP_TOOL_NAMES, mcpSchemas, mcpEndpoint, resolveBaseUrl } from "./index";

describe("Pholio MCP Server package", () => {
  it("exposes the six tool names", () => {
    expect([...MCP_TOOL_NAMES]).toEqual([
      "pholio_update_project",
      "pholio_publish_showcase",
      "pholio_sync_readme",
      "pholio_upload_mockup",
      "pholio_get_stats",
      "pholio_get_leaderboard",
    ]);
  });

  it("validates tool args with shared zod schemas", () => {
    expect(mcpSchemas.publishShowcase.parse({ project_slug: "x", body: "0123456789" }).body).toBe("0123456789");
    expect(() => mcpSchemas.publishShowcase.parse({ project_slug: "x", body: "short" })).toThrow();
  });

  it("resolves the MCP endpoint from env", () => {
    expect(resolveBaseUrl()).toMatch(/^https?:\/\//);
    expect(mcpEndpoint()).toMatch(/\/api\/mcp$/);
  });
});
