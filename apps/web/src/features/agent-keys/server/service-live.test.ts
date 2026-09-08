import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-that-is-long-enough",
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { listApiKeys } from "./service";

const mockedCreateAdminClient = vi.mocked(createAdminClient);

function stubQuery(result: { data: unknown; error: { message: string } | null }) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mockedCreateAdminClient.mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
  } as never);
}

describe("listApiKeys with live Supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws instead of returning an empty list when the query fails", async () => {
    stubQuery({
      data: null,
      error: { message: 'column "last_used_at" does not exist' },
    });

    await expect(listApiKeys("user-1")).rejects.toThrow(/Failed to list API keys/);
  });

  it("returns mapped rows when the query succeeds", async () => {
    stubQuery({
      data: [
        {
          id: "key-1",
          name: "Cursor",
          prefix: "pholio_live_abc12345",
          scopes: ["showcase:write"],
          created_at: "2026-09-07T07:53:55.160Z",
          revoked_at: null,
          last_used_at: null,
        },
      ],
      error: null,
    });

    const keys = await listApiKeys("user-1");
    expect(keys).toHaveLength(1);
    expect(keys[0].prefix).toBe("pholio_live_abc12345");
  });
});
