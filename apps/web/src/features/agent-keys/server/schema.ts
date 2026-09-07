import { z } from "zod";

export const generateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Name must be 64 characters or fewer").default("Cursor IDE agent"),
  scopes: z.array(z.string()).default(["showcase:write"]),
});

export const revokeApiKeySchema = z.object({
  id: z.string().min(1, "API key ID is required"),
});

export type GenerateApiKeyInput = z.infer<typeof generateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
