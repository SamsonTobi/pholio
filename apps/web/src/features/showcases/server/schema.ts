import { z } from "zod";

export const createShowcaseSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  body: z
    .string()
    .min(10, "Showcase update body must be at least 10 characters")
    .max(600, "Showcase update body cannot exceed 600 characters"),
  source: z.enum(["github", "agent", "manual"]).default("manual"),
  meta: z.record(z.unknown()).default({}),
  is_pinned: z.boolean().optional(),
});

export const updateShowcaseSchema = z.object({
  id: z.string().min(1),
  body: z
    .string()
    .min(10, "Showcase update body must be at least 10 characters")
    .max(600, "Showcase update body cannot exceed 600 characters")
    .optional(),
  is_pinned: z.boolean().optional(),
  meta: z.record(z.unknown()).optional(),
});

export const showcaseCreateSchema = createShowcaseSchema;
export const showcaseUpdateSchema = updateShowcaseSchema;

export type CreateShowcaseInput = z.infer<typeof createShowcaseSchema>;
export type UpdateShowcaseInput = z.infer<typeof updateShowcaseSchema>;
export type ShowcaseCreateInput = CreateShowcaseInput;
export type ShowcaseUpdateInput = UpdateShowcaseInput;

