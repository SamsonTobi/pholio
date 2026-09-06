import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  headline: z.string().max(100).optional(),
  site_url: z.string().url().or(z.literal("")).optional(),
  template: z.enum(["story", "index"]).optional(),
});

export const changeSlugSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangeSlugInput = z.infer<typeof changeSlugSchema>;
