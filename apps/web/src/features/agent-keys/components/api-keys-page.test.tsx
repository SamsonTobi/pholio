import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ApiKeysSection } from "@/features/agent-keys/components/ApiKeysSection";
import AgentDocsPage from "@/app/docs/agent/page";

// Async MarketingNav (session-aware) suspends under legacy renderToString;
// stub the chrome, this suite asserts page body content only.
vi.mock("@/components/marketing-nav", () => ({
  MarketingNav: () => null,
  MarketingFooter: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard/settings",
}));

describe("Agent API Keys UI Pages", () => {
  it("renders Agent API Keys dashboard page with honest loading/empty state and no demo keys", () => {
    const html = renderToString(<ApiKeysSection />);
    expect(html).toContain("Agent API Keys");
    expect(html).toContain(
      "Generate API keys to empower AI coding agents (Claude, Cursor, Copilot, Antigravity) to update your showcase automatically via MCP."
    );
    expect(html).toContain("Generate API Key");
    // No hardcoded demo keys
    expect(html).not.toContain("Cursor IDE agent");
    expect(html).not.toContain("Claude Desktop agent");
    expect(html).not.toContain("pholio_live_9c2b4a1e");
    // Honest initial state: loading or empty, plus instructions
    expect(html).toMatch(/Loading API keys|No API keys generated yet/);
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
