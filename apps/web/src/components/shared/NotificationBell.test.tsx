import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { NotificationBell } from "./NotificationBell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("NotificationBell Component", () => {
  it("renders notification bell button with accessible aria label", () => {
    const html = renderToString(<NotificationBell />);
    expect(html).toContain("aria-label=\"Open notifications\"");
    expect(html).toContain("lucide-bell");
  });

  it("starts empty with no fake unread badge", () => {
    const html = renderToString(<NotificationBell />);
    // Honest initial state: [] notifications, no fabricated unread badge
    expect(html).not.toContain("unread");
    expect(html).not.toContain("Lagos Hackers");
  });
});
