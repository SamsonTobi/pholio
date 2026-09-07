import { z } from "zod";

export const mcpSchemas = {
  updateProject: z.object({
    project_slug: z.string(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
    live_url: z.string().url().optional(),
    status: z.enum(["active", "archived"]).optional(),
  }),
  publishShowcase: z.object({
    project_slug: z.string(),
    body: z.string().min(10).max(600),
  }),
  syncReadme: z.object({
    project_slug: z.string(),
  }),
  uploadMockup: z.object({
    project_slug: z.string(),
    file_base64: z.string(),
    device: z.enum(["browser", "phone", "tablet"]),
  }),
  getStats: z.object({
    project_slug: z.string(),
    days: z.number().int().min(1).max(30).default(7),
  }),
  getLeaderboard: z.object({
    group_slug: z.string().optional(),
  }),
};
