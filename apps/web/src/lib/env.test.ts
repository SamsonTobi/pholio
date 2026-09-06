import { describe, it, expect } from "vitest";
import { APP_URL, TRACKER_URL, REALTIME_URL, showcaseUrl, inviteUrl, projectDeepUrl } from "./env";

describe("env helpers", () => {
  it("derives URLs from environment without trailing slash", () => {
    expect(APP_URL).toBeDefined();
    expect(APP_URL.endsWith("/")).toBe(false);
    expect(TRACKER_URL).toBeDefined();
    expect(REALTIME_URL).toBeDefined();
  });

  it("builds correct showcase URLs", () => {
    expect(showcaseUrl("tobi")).toBe(`${APP_URL}/tobi`);
  });

  it("builds correct invite URLs", () => {
    expect(inviteUrl("secret-token")).toBe(`${APP_URL}/hacker-groups/join/secret-token`);
  });

  it("builds correct project deep URLs", () => {
    expect(projectDeepUrl("tobi", "pholio")).toBe(`${APP_URL}/tobi/pholio`);
  });
});
