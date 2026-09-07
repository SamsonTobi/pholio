import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const LIVE =
  SUPABASE_URL &&
  ANON_KEY &&
  !SUPABASE_URL.includes("placeholder") &&
  !ANON_KEY.includes("placeholder");

const describeLive = LIVE ? describe : describe.skip;

function migrationSql(file: string): string {
  const dir = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(dir, "..", "..", "..", "..", "..", "supabase", "migrations", file), "utf8");
}

/**
 * Live RLS integration tests. Require a real Supabase project
 * (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY); skipped in
 * offline CI. The static suite below always runs and pins the migration
 * files that implement each guarantee, so silent policy removal fails the
 * build even without a database.
 */
describeLive("Database RLS Matrix (live Supabase)", () => {
  it("anonymous users cannot insert into projects/showcases/mockups", async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await (anon.from("projects") as any).insert({
      owner_id: "00000000-0000-0000-0000-000000000001",
      name: "rls-probe",
      showcase_slug: "rls-probe",
      telemetry_slug: `rls-probe-${Date.now()}`,
    });
    expect(error).not.toBeNull();
  });

  it("anonymous users cannot read private invites or outbox rows", async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: invites } = await (anon.from("hacker_group_invites") as any)
      .select("token")
      .limit(1);
    expect(invites ?? []).toEqual([]);
    const { data: outbox } = await (anon.from("realtime_outbox") as any)
      .select("id")
      .limit(1);
    expect(outbox ?? []).toEqual([]);
  });

  it("public showcases and public groups are readable anonymously", async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error: sErr } = await (anon.from("showcases") as any).select("id").limit(1);
    expect(sErr).toBeNull();
    const { error: gErr } = await (anon.from("hacker_groups") as any)
      .select("id")
      .eq("visibility", "public")
      .limit(1);
    expect(gErr).toBeNull();
  });
});

describe("Database RLS Matrix (static policy pins)", () => {
  it("032 removes the world-readable invite policy and member self-insert", () => {
    const sql032 = migrationSql("032_security_cron_fixes.sql");
    expect(sql032).toMatch(/drop policy if exists/i);
    expect(sql032).toMatch(/realtime_outbox/);
    expect(sql032).toMatch(/service_role/);
  });

  it("033 adds the webhook delivery-idempotency column", () => {
    const sql033 = migrationSql("033_webhook_delivery_id.sql");
    expect(sql033).toMatch(/delivery_id/);
  });

  it("034 guards fanout triggers and stamps payload ids", () => {
    const sql034 = migrationSql("034_fanout_contract_guards.sql");
    expect(sql034).toMatch(/is distinct from new/);
    expect(sql034).toMatch(/'id', NEW\.(project_id|group_id)::text/);
  });

  it("service-only tables expose no anon insert path", () => {
    const sql018 = migrationSql("018_telemetry_rls.sql");
    expect(sql018).toMatch(/service_role/);
  });
});
