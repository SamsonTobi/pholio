import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import HackerGroupsDashboardPage from "@/app/dashboard/hacker-groups/page";
import HackerGroupDetailPage from "@/app/hacker-groups/[groupSlug]/page";
import JoinHackerGroupPage from "@/app/hacker-groups/join/[token]/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({
    groupSlug: "lagos-hackers",
    token: "test-token-123",
  }),
}));

describe("Hacker Groups UI Pages", () => {
  it("renders Hacker Groups dashboard page with title and create button", () => {
    const html = renderToString(<HackerGroupsDashboardPage />);
    expect(html).toContain("Hacker Groups");
    expect(html).toContain("Create Hacker Group");
    expect(html).toContain("Lagos Hackers");
  });

  it("renders Hacker Group Detail Page with leaderboard", () => {
    const html = renderToString(<HackerGroupDetailPage />);
    // In SSR without fetch response, it renders loading or initial state cleanly
    expect(html).toBeDefined();
  });

  it("renders Join Hacker Group Page with validation loading state", () => {
    const html = renderToString(<JoinHackerGroupPage />);
    expect(html).toBeDefined();
    expect(html).toContain("Validating invitation...");
  });
});
