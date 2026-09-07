import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters")
    .max(100, "Group name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Group slug must be at least 2 characters")
    .max(50, "Group slug cannot exceed 50 characters")
    .regex(slugRegex, "Group slug must consist of lowercase alphanumeric characters and hyphens"),
  visibility: z.enum(["public", "private"]).default("private"),
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters")
    .max(100, "Group name cannot exceed 100 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Group slug must be at least 2 characters")
    .max(50, "Group slug cannot exceed 50 characters")
    .regex(slugRegex, "Group slug must consist of lowercase alphanumeric characters and hyphens")
    .optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const inviteSchema = z.object({
  group_id: z.string().uuid("Invalid group ID"),
  github_username: z.string().trim().optional(),
  multi_use: z.boolean().default(true),
});

export const joinTokenSchema = z.object({
  token: z.string().trim().min(6, "Token must be at least 6 characters"),
});

// Aliases for route compatibility
export const createInviteSchema = inviteSchema;
export const joinGroupSchema = joinTokenSchema;

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type JoinTokenInput = z.infer<typeof joinTokenSchema>;
export type CreateInviteInput = InviteInput;
export type JoinGroupInput = JoinTokenInput;
