import { z } from "zod";

export const importSchema = z.object({
  repo_full_names: z.array(z.string().min(1)).min(1, "Pick at least one repo to showcase"),
});

export const resyncSchema = z.object({
  project_id: z.string().uuid(),
});

export type ImportInput = z.infer<typeof importSchema>;
export type ResyncInput = z.infer<typeof resyncSchema>;
