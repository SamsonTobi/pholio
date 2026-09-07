import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AgentSetupBanner, buildAgentSetupPrompt } from "./AgentSetupBanner";

describe("AgentSetupBanner", () => {
  it("renders heading, agent compatibility line, and copy action", () => {
    const html = renderToString(<AgentSetupBanner appUrl="https://pholio.cc" />);
    expect(html).toContain("Connect your coding agent");
    expect(html).toContain("Works with all coding agents");
    expect(html).toContain("Cursor");
    expect(html).toContain("Copy setup prompt");
    expect(html).toContain("Waiting for first agent connection");
  });

  it("builds a setup prompt with approval gate, key, and endpoint", () => {
    const prompt = buildAgentSetupPrompt({
      token: "pholio_live_abc123_secret",
      appUrl: "https://pholio.cc",
    });
    expect(prompt).toContain("pholio_live_abc123_secret");
    expect(prompt).toContain("https://pholio.cc/api/mcp");
    expect(prompt).toContain("WAIT for my approval");
    expect(prompt).toContain("Never update or publish anything");
  });
});
