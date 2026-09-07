import { z } from "zod";

// NOTE: per-key rate limiting is enforced in apps/web /api/mcp (in-memory,
// single instance; use a shared store for multi-instance prod).

export const MCP_TOOL_NAMES = [
  "pholio_update_project",
  "pholio_publish_showcase",
  "pholio_sync_readme",
  "pholio_upload_mockup",
  "pholio_get_stats",
  "pholio_get_leaderboard",
] as const;

export const mcpSchemas = {
  updateProject: z.object({
    project_slug: z.string().min(1).max(100),
    summary: z.string().max(2000).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    live_url: z.string().url().max(2048).optional(),
    status: z.enum(["active", "archived"]).optional(),
  }),
  publishShowcase: z.object({
    project_slug: z.string().min(1).max(100),
    body: z.string().min(10).max(600),
  }),
  syncReadme: z.object({
    project_slug: z.string().min(1).max(100),
  }),
  uploadMockup: z.object({
    project_slug: z.string().min(1).max(100),
    file_base64: z.string().min(1).max(7 * 1024 * 1024),
    device: z.enum(["browser", "phone", "tablet"]),
    mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).default("image/png"),
  }),
  getStats: z.object({
    project_slug: z.string().min(1).max(100),
    days: z.number().int().min(1).max(30).default(7),
  }),
  getLeaderboard: z.object({
    group_slug: z.string().min(1).max(100),
  }),
};
