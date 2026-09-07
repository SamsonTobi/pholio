import { z } from "zod";

export const ingestSchema = z.object({
  telemetry_slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "telemetry_slug must be lowercase alphanumeric with dashes"),
  session_hash: z.string().min(3).max(128),
  path: z.string().max(500).optional().default("/"),
});

export type IngestInput = z.infer<typeof ingestSchema>;

export const statsQuerySchema = z.preprocess(
  (input: unknown) => {
    if (input && typeof input === "object") {
      const record = input as Record<string, unknown>;
      if (!record.project_slug && typeof record.telemetry_slug === "string") {
        return {
          ...record,
          project_slug: record.telemetry_slug,
        };
      }
    }
    return input;
  },
  z.object({
    project_slug: z.string().min(1),
    days: z.coerce.number().int().min(1).max(30).default(7),
  })
);

export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
