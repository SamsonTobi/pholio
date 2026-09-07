import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SiteNav } from "./SiteNav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("SiteNav", () => {
  it("shows Join Pholio for logged-out visitors", () => {
    const html = renderToString(<SiteNav isLoggedIn={false} />);
    expect(html).toContain("Join Pholio");
    expect(html).not.toContain("Join hacker group");
  });

  it("shows hacker group link and account menu for logged-in users", () => {
    const html = renderToString(
      <SiteNav
        isLoggedIn
        email="tobi@example.com"
        avatarUrl={null}
        showcaseHref="/tobi"
      />
    );
    expect(html).toContain("Join hacker group");
    expect(html).not.toContain("Join Pholio");
  });
});
