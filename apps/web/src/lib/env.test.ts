import { describe, it, expect, vi, afterEach } from "vitest";
import {
  APP_URL,
  TRACKER_URL,
  REALTIME_URL,
  showcaseUrl,
  inviteUrl,
  projectDeepUrl,
} from "./env";

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

const ENV_PATH = "./env.ts";

function setBrowserProdEnv(appUrl: string) {
  vi.stubEnv("NODE_ENV", "production");
  // Simulate the production *browser* bundle: Next.js strips every
  // non-NEXT_PUBLIC_* variable from client JS.
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith("SUPABASE_") ||
      key.startsWith("NEXT_PUBLIC_SUPABASE_") ||
      key.startsWith("RESEND_") ||
      key.startsWith("GITHUB_") ||
      key === "CRON_SECRET" ||
      key === "REALTIME_FANOUT_SECRET" ||
      key === "PHOLIO_BASE_URL" ||
      key === "NEXT_PUBLIC_TRACKER_URL" ||
      key === "NEXT_PUBLIC_REALTIME_URL"
    ) {
      vi.stubEnv(key, "");
    }
  }
  vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
  // `typeof window !== "undefined"` marks the client bundle.
  (globalThis as Record<string, unknown>).window = {};
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as Record<string, unknown>).window;
  vi.resetModules();
});

describe("env client safety (pholio.cc login crash)", () => {
  it("does not throw in the prod browser bundle without server-only vars", async () => {
    setBrowserProdEnv("https://pholio.cc");
    vi.resetModules();
    const mod = await import(`${ENV_PATH}?browser-prod`);
    expect(mod.APP_URL).toContain("pholio.cc");
    expect(mod.RESEND_FROM).toContain("@");
  });

  it("does not throw on a bare-domain app url", async () => {
    setBrowserProdEnv("pholio.cc");
    vi.resetModules();
    const mod = await import(`${ENV_PATH}?browser-bare`);
    expect(mod.APP_URL.startsWith("https://")).toBe(true);
  });
});
