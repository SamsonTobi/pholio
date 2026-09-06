import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { APP_URL } from "@/lib/env";

describe("GET /api/health", () => {
  it("returns ok true and environment url without secrets", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      env: APP_URL,
    });
  });
});
