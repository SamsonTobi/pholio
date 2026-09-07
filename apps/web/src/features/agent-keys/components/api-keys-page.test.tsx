import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import ApiKeysPage from "@/app/dashboard/api-keys/page";
import AgentDocsPage from "@/app/docs/agent/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard/api-keys",
}));

describe("Agent API Keys UI Pages", () => {
  it("renders Agent API Keys dashboard page with header, button, table headers, and instructions", () => {
    const html = renderToString(<ApiKeysPage />);
    expect(html).toContain("Agent API Keys");
    expect(html).toContain(
      "Generate API keys to empower AI coding agents (Claude, Cursor, Copilot, Antigravity) to update your showcase automatically via MCP."
    );
    expect(html).toContain("Generate API Key");
    expect(html).toContain("Name");
    expect(html).toContain("Prefix");
    expect(html).toContain("Scopes");
    expect(html).toContain("Created Date");
    expect(html).toContain("Status");
    expect(html).toContain("Quick Configuration Instructions");
    expect(html).toContain("Cursor (.cursor/mcp.json)");
    expect(html).toContain("Claude Desktop (claude_desktop_config.json)");
    expect(html).toContain("Antigravity / Cline");
  });

  it("renders Agent Documentation page (/docs/agent) with tool specifications and master prompt", () => {
    const html = renderToString(<AgentDocsPage />);
    expect(html).toContain("Pholio for AI Coding Agents");
    expect(html).toContain("Model Context Protocol (MCP)");
    expect(html).toContain("update_project");
    expect(html).toContain("publish_showcase");
    expect(html).toContain("sync_readme");
    expect(html).toContain("upload_mockup");
    expect(html).toContain("get_stats");
    expect(html).toContain("get_leaderboard");
    expect(html).toContain("Recommended Master Prompt");
  });
});
