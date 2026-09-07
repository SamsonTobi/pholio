import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import crypto from "node:crypto";

export interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
}

export interface StoredApiKey extends ApiKeyItem {
  user_id: string;
  key_hash: string;
}

export interface GenerateApiKeyParams {
  userId: string;
  name?: string | null;
  scopes?: string[];
}

export interface GeneratedApiKey {
  id: string;
  token: string;
  prefix: string;
  name: string | null;
  scopes: string[];
  key: ApiKeyItem & { user_id: string };
}

export const ALLOWED_SCOPES = ["showcase:write", "stats:read", "leaderboard:read"] as const;
export type AllowedScope = (typeof ALLOWED_SCOPES)[number];

/** Default scopes for new keys: full access (write implies read). */
export const DEFAULT_SCOPES: string[] = [...ALLOWED_SCOPES];

function normalizeScopes(scopes?: string[]): string[] {
  if (!scopes || scopes.length === 0) return [...DEFAULT_SCOPES];
  const filtered = scopes.filter((s): s is string =>
    (ALLOWED_SCOPES as readonly string[]).includes(s)
  );
  if (filtered.length === 0) {
    throw new Error(`Invalid scopes. Allowed: ${ALLOWED_SCOPES.join(", ")}`);
  }
  return Array.from(new Set(filtered));
}

// In-memory fallback store when Supabase credentials are not configured or offline
const inMemoryApiKeys = new Map<string, StoredApiKey>();

export function resetInMemoryApiKeys(): void {
  inMemoryApiKeys.clear();
}

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

/**
 * Generates random hex characters of the requested length.
 */
export function randomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

/**
 * Extracts prefix from live token: pholio_live_${hex8}_${hex32} -> pholio_live_${hex8}
 */
export function extractPrefix(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim();
  const parts = trimmed.split("_");
  if (parts.length >= 4 && parts[0] === "pholio" && parts[1] === "live") {
    return `pholio_live_${parts[2]}`;
  }
  return null;
}

/**
 * Parses a live token into its prefix and secret parts.
 * Format: pholio_live_<prefix>_<secret>
 */
export function parseToken(token: string): { prefix: string; secret: string } | null {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim();
  const parts = trimmed.split("_");
  if (parts.length === 4 && parts[0] === "pholio" && parts[1] === "live") {
    return {
      prefix: `pholio_live_${parts[2]}`,
      secret: parts[3],
    };
  }
  return null;
}

/**
 * Constant-time comparison wrapper around crypto.timingSafeEqual.
 */
export function timingSafeEqualCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export const constantTimeCompare = timingSafeEqualCompare;

/**
 * Generates a new live API key. Plaintext token is returned only once.
 */
export async function generateApiKey({
  userId,
  name,
  scopes = [...DEFAULT_SCOPES],
}: GenerateApiKeyParams): Promise<GeneratedApiKey> {
  const normalizedScopes = normalizeScopes(scopes);
  const hexPrefix = randomHex(8);
  const hexSecret = randomHex(32);
  const prefix = `pholio_live_${hexPrefix}`;
  const token = `${prefix}_${hexSecret}`;
  const keyHash = crypto.createHash("sha256").update(token).digest("hex");
  const keyName = name?.trim() || null;
  const keyId = crypto.randomUUID();
  const now = new Date().toISOString();

  let insertedId = keyId;
  let insertedCreatedAt = now;

  if (isSupabaseLive()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await (admin.from("api_keys") as any)
        .insert({
          id: keyId,
          user_id: userId,
          name: keyName,
          prefix,
          key_hash: keyHash,
          scopes: normalizedScopes,
        })
        .select()
        .single();

      if (!error && data) {
        insertedId = data.id;
        insertedCreatedAt = data.created_at;
      }
    } catch {
      // Fallback
    }
  }

  const storedKey: StoredApiKey = {
    id: insertedId,
    user_id: userId,
    name: keyName,
    prefix,
    key_hash: keyHash,
    scopes: normalizedScopes,
    created_at: insertedCreatedAt,
    revoked_at: null,
  };

  inMemoryApiKeys.set(prefix, storedKey);

  return {
    id: insertedId,
    token,
    prefix,
    name: keyName,
    scopes: normalizedScopes,
    key: storedKey,
  };
}

/**
 * Lists all API keys belonging to a user (excludes secrets).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyItem[]> {
  if (isSupabaseLive()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await (admin.from("api_keys") as any)
        .select("id, name, prefix, scopes, created_at, revoked_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((k: any) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes || [],
          created_at: k.created_at,
          revoked_at: k.revoked_at,
        }));
      }
    } catch {
      // Fallback
    }
  }

  return Array.from(inMemoryApiKeys.values())
    .filter((k) => k.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      created_at: k.created_at,
      revoked_at: k.revoked_at,
    }));
}

/**
 * Revokes an existing API key by setting revoked_at = now().
 */
export async function revokeApiKey({
  keyId,
  userId,
}: {
  keyId: string;
  userId: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  let revoked = false;

  if (isSupabaseLive()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await (admin.from("api_keys") as any)
        .update({ revoked_at: now })
        .eq("id", keyId)
        .eq("user_id", userId)
        .select()
        .maybeSingle();

      if (!error && data) {
        revoked = true;
      }
    } catch {
      // Fallback
    }
  }

  for (const record of inMemoryApiKeys.values()) {
    if (record.id === keyId && record.user_id === userId) {
      record.revoked_at = now;
      revoked = true;
    }
  }

  return revoked;
}

/**
 * Verifies an API key token.
 * Extracts prefix, computes SHA-256 hash, uses timingSafeEqual comparison.
 * Returns { userId, scopes } if valid and not revoked, null otherwise.
 */
export async function verifyApiKey(
  token: string
): Promise<{ userId: string; scopes: string[]; prefix: string } | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  const prefix = extractPrefix(token);
  if (!prefix) {
    return null;
  }

  const computedHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  if (isSupabaseLive()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await (admin.from("api_keys") as any)
        .select("*")
        .eq("prefix", prefix)
        .maybeSingle();

      if (!error && data) {
        if (data.revoked_at !== null) {
          return null;
        }
        if (timingSafeEqualCompare(computedHash, data.key_hash)) {
          return {
            userId: data.user_id,
            scopes: data.scopes || ["showcase:write"],
            prefix,
          };
        }
        return null;
      }
    } catch {
      // Fallback
    }
  }

  const inMemory = inMemoryApiKeys.get(prefix);
  if (inMemory) {
    if (inMemory.revoked_at !== null) {
      return null;
    }
    if (timingSafeEqualCompare(computedHash, inMemory.key_hash)) {
      return {
        userId: inMemory.user_id,
        scopes: inMemory.scopes || ["showcase:write"],
        prefix,
      };
    }
    return null;
  }

  return null;
}
