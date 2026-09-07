import { z } from "zod";

export const ALLOWED_SCOPES = ["showcase:write", "stats:read", "leaderboard:read"] as const;

export const FULL_SCOPES: Array<(typeof ALLOWED_SCOPES)[number]> = [...ALLOWED_SCOPES];

export const generateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Name must be 64 characters or fewer").default("Cursor IDE agent"),
  scopes: z.array(z.enum(ALLOWED_SCOPES)).default([...ALLOWED_SCOPES]),
});

export const revokeApiKeySchema = z.object({
  id: z.string().min(1, "API key ID is required"),
});

export type GenerateApiKeyInput = z.infer<typeof generateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
