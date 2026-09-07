import { z } from "zod";

// Project Schema
export const projectSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  github_repo_id: z.number().nullable().optional(),
  github_full_name: z.string().nullable().optional(),
  name: z.string().min(1).max(100),
  showcase_slug: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  readme_summary: z.string().nullable().optional(),
  icon_url: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
  language: z.string().nullable().optional(),
  stars: z.number().int().nonnegative().default(0),
  live_url: z.string().url().nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  last_push_at: z.string().datetime().nullable().optional(),
  telemetry_slug: z.string().min(3).max(64),
  created_at: z.string().datetime().optional(),
});

export type Project = z.infer<typeof projectSchema>;

// Showcase Schema
export const showcaseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  body: z.string().min(10).max(600),
  meta: z.record(z.unknown()).default({}),
  published_at: z.string().datetime().optional(),
  source: z.enum(["github", "agent", "manual"]).default("manual"),
});

export type Showcase = z.infer<typeof showcaseSchema>;

// Mockup Schema
export const mockupSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  storage_path: z.string(),
  device: z.enum(["browser", "phone", "tablet"]),
  sort: z.number().int().default(0),
});

export type Mockup = z.infer<typeof mockupSchema>;

// MCP Schemas
export * from "./mcpSchemas";

// Activity scoring stubs
export interface ScoringInputs {
  pushes7d: number;
  showcases7d: number;
  lastPushAt: string | null;
}

export function computeRecencyBonus(lastPushAt: string | null): number {
  if (!lastPushAt) return 0;
  const hoursSince = (Date.now() - new Date(lastPushAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince < 24) return 5;
  if (hoursSince < 72) return 2;
  return 0;
}

export function computeActivityScore(inputs: ScoringInputs): number {
  const recencyBonus = computeRecencyBonus(inputs.lastPushAt);
  return inputs.pushes7d * 10 + inputs.showcases7d * 15 + recencyBonus;
}
