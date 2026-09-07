import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface IngestEventInput {
  telemetrySlug?: string;
  telemetry_slug?: string;
  sessionHash?: string;
  session_hash?: string;
  path?: string | null;
}

export interface DayStat {
  day: string;
  visitors: number;
  actives_7d: number;
}

export interface StatsTotals {
  visitors_7d: number;
  actives_7d: number;
}

export interface StatsResult {
  days: DayStat[];
  totals: StatsTotals;
  /** True when the numbers are local demo data, never real analytics. */
  demo?: boolean;
}

export interface GetStatsInput {
  projectSlug: string;
  days?: number;
}

export interface MockRawEvent {
  telemetrySlug: string;
  sessionHash: string;
  path: string;
  ts: Date;
}

const mockRawEvents: MockRawEvent[] = [];

export function resetMockEvents(): void {
  mockRawEvents.length = 0;
}

export function getMockEvents(): MockRawEvent[] {
  return [...mockRawEvents];
}

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

export function generateDeterministicStats(projectSlug: string, days: number = 7): StatsResult {
  let hash = 0;
  for (let i = 0; i < projectSlug.length; i++) {
    hash = (hash << 5) - hash + projectSlug.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  const resultDays: DayStat[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];

    const daySeed = (seed + i * 37) % 100;
    const weekday = d.getDay();
    const weekendMultiplier = weekday === 0 || weekday === 6 ? 0.7 : 1.0;

    const visitors = Math.max(5, Math.round((25 + (daySeed % 40)) * weekendMultiplier));
    const actives_7d = Math.max(
      visitors,
      Math.round(visitors * 2.5 + ((seed + i * 19) % 25))
    );

    resultDays.push({
      day: dayStr,
      visitors,
      actives_7d,
    });
  }

  const recentDays = resultDays.slice(-7);
  const visitors_7d = recentDays.reduce((acc, curr) => acc + curr.visitors, 0);
  const actives_7d = resultDays.length > 0 ? resultDays[resultDays.length - 1].actives_7d : 0;

  return {
    days: resultDays,
    totals: {
      visitors_7d,
      actives_7d,
    },
  };
}

export async function ingestEvent(input: IngestEventInput): Promise<boolean> {
  const telemetrySlug = input.telemetrySlug || input.telemetry_slug;
  const sessionHash = input.sessionHash || input.session_hash;
  const path = input.path || "/";

  if (!telemetrySlug || !sessionHash) {
    return false;
  }

  if (isSupabaseLive()) {
    const supabase = createAdminClient();
    const { error } = await (supabase.from("raw_events") as any).insert({
      telemetry_slug: telemetrySlug,
      session_hash: sessionHash,
      path,
    });

    if (error) {
      throw new Error(`ingest failed: ${error.message}`);
    }
    return true;
  }

  // Local-only fallback when Supabase is not configured (dev/test).
  mockRawEvents.push({ telemetrySlug, sessionHash, path, ts: new Date() });
  return true;
}

export async function getStats({
  projectSlug,
  days = 7,
}: GetStatsInput): Promise<StatsResult> {
  const clampedDays = Math.max(1, Math.min(30, days));

  if (isSupabaseLive()) {
    try {
      const supabase = createAdminClient();

      const { data: project } = await (supabase.from("projects") as any)
        .select("id, showcase_slug, telemetry_slug")
        .or(`showcase_slug.eq.${projectSlug},telemetry_slug.eq.${projectSlug}`)
        .maybeSingle();

      if (project?.id) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (clampedDays - 1));
        const startDateStr = startDate.toISOString().split("T")[0];

        const { data: rows, error } = await (supabase.from("daily_stats") as any)
          .select("day, visitors, actives_7d")
          .eq("project_id", project.id)
          .gte("day", startDateStr)
          .order("day", { ascending: true });

        if (!error && rows && rows.length > 0) {
          const dayStats: DayStat[] = rows.map((r: any) => ({
            day: String(r.day),
            visitors: Number(r.visitors) || 0,
            actives_7d: Number(r.actives_7d) || 0,
          }));

          const recentDays = dayStats.slice(-7);
          const visitors_7d = recentDays.reduce((acc, curr) => acc + curr.visitors, 0);
          const actives_7d =
            dayStats.length > 0 ? dayStats[dayStats.length - 1].actives_7d : 0;

          return {
            days: dayStats,
            totals: {
              visitors_7d,
              actives_7d,
            },
            demo: false,
          };
        }
      }
    } catch {
      // Database error with live backend: fall through to honest empty result.
    }

    // Live backend but no rows for this project: honest empty result.
    return { days: [], totals: { visitors_7d: 0, actives_7d: 0 }, demo: false };
  }

  // Deterministic demo data when database is offline (dev/test only).
  return { ...generateDeterministicStats(projectSlug, clampedDays), demo: true };
}

export async function hasEvents(telemetrySlug: string): Promise<boolean> {
  if (!telemetrySlug) return false;

  // In-memory events are a dev/test offline-mode store only — never consult
  // them when a live backend is configured.
  if (!isSupabaseLive() && mockRawEvents.some((e) => e.telemetrySlug === telemetrySlug)) {
    return true;
  }

  if (isSupabaseLive()) {
    try {
      const supabase = createAdminClient();

      const { count: rawCount, error: rawError } = await (supabase.from("raw_events") as any)
        .select("id", { count: "exact", head: true })
        .eq("telemetry_slug", telemetrySlug);

      if (!rawError && typeof rawCount === "number" && rawCount > 0) {
        return true;
      }

      const { data: project } = await (supabase.from("projects") as any)
        .select("id")
        .eq("telemetry_slug", telemetrySlug)
        .maybeSingle();

      if (project?.id) {
        const { count: statsCount, error: statsError } = await (
          supabase.from("daily_stats") as any
        )
          .select("project_id", { count: "exact", head: true })
          .eq("project_id", project.id);

        if (!statsError && typeof statsCount === "number" && statsCount > 0) {
          return true;
        }
      }
    } catch {
      // Database offline
    }
  }

  return false;
}
