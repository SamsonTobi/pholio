import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  verifyApiKey,
  parseToken,
  constantTimeCompare,
  randomHex,
  extractPrefix,
  resetInMemoryApiKeys,
} from "./service";
import {
  generateApiKeySchema,
  revokeApiKeySchema,
} from "./schema";

describe("Agent Keys Feature", () => {
  beforeEach(() => {
    resetInMemoryApiKeys();
  });

  describe("Schema Validation", () => {
    it("validates valid generate key payload", () => {
      const parsed = generateApiKeySchema.parse({
        name: "Cursor Agent",
      });
      expect(parsed.name).toBe("Cursor Agent");
      expect(parsed.scopes).toEqual(["showcase:write"]);
    });

    it("defaults name when not provided", () => {
      const parsed = generateApiKeySchema.parse({});
      expect(parsed.name).toBe("Cursor IDE agent");
    });

    it("rejects invalid revoke key payload", () => {
      expect(() => revokeApiKeySchema.parse({ id: "" })).toThrow();
    });
  });

  describe("Token Parsing and Constant-Time Comparison", () => {
    it("correctly parses valid pholio_live token", () => {
      const token = "pholio_live_c8e9f2a1_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d";
      const parsed = parseToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe("pholio_live_c8e9f2a1");
      expect(parsed?.secret).toBe("9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d");
    });

    it("returns null for malformed token", () => {
      expect(parseToken("invalid_token")).toBeNull();
      expect(parseToken("pholio_test_123_456")).toBeNull();
      expect(parseToken("pholio_live_123")).toBeNull();
    });

    it("constant-time compare matches identical strings and rejects different ones", () => {
      expect(constantTimeCompare("secret_hash_123", "secret_hash_123")).toBe(true);
      expect(constantTimeCompare("secret_hash_123", "secret_hash_456")).toBe(false);
      expect(constantTimeCompare("secret_hash_123", "short")).toBe(false);
    });

    it("verifies randomHex and extractPrefix helpers", () => {
      const hex8 = randomHex(8);
      const hex32 = randomHex(32);
      expect(hex8).toHaveLength(8);
      expect(hex32).toHaveLength(32);

      const token = `pholio_live_${hex8}_${hex32}`;
      expect(extractPrefix(token)).toBe(`pholio_live_${hex8}`);
    });
  });

  describe("Token generation format", () => {
    it("verifies token generation format starts with pholio_live and has expected structure", async () => {
      const result = await generateApiKey({
        userId: "00000000-0000-0000-0000-000000000001",
        name: "Cursor IDE agent",
        scopes: ["showcase:write"],
      });

      expect(result.token).toMatch(/^pholio_live_[0-9a-f]{8}_[0-9a-f]{32}$/);
      expect(result.prefix).toMatch(/^pholio_live_[0-9a-f]{8}$/);
      expect(result.token.startsWith(`${result.prefix}_`)).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Cursor IDE agent");
      expect(result.scopes).toEqual(["showcase:write"]);
    });
  });

  describe("Key Lifecycle (Generate, List, Verify, Revoke)", () => {
    const testUserId = "00000000-0000-0000-0000-000000000001";

    it("generates live key with plaintext token returned once", async () => {
      const result = await generateApiKey({
        userId: testUserId,
        name: "Test Cursor Agent",
      });

      expect(result.key.id).toBeDefined();
      expect(result.key.name).toBe("Test Cursor Agent");
      expect(result.key.prefix.startsWith("pholio_live_")).toBe(true);
      expect(result.key.revoked_at).toBeNull();
      expect(result.token.startsWith(result.key.prefix)).toBe(true);

      // Verify the generated token works
      const auth = await verifyApiKey(result.token);
      expect(auth).not.toBeNull();
      expect(auth?.userId).toBe(testUserId);
      expect(auth?.scopes).toEqual(["showcase:write"]);
    });

    it("rejects token with modified secret, wrong prefix, or invalid format", async () => {
      const result = await generateApiKey({
        userId: testUserId,
        name: "Tamper Test Agent",
      });

      // Wrong prefix
      const wrongPrefixToken = "pholio_live_00000000_11112222333344445555666677778888";
      expect(await verifyApiKey(wrongPrefixToken)).toBeNull();

      // Tampered secret
      const tamperedToken = `${result.key.prefix}_tampered_secret_xyz123`;
      const auth = await verifyApiKey(tamperedToken);
      expect(auth).toBeNull();

      // Malformed string
      expect(await verifyApiKey("")).toBeNull();
      expect(await verifyApiKey("invalid_format")).toBeNull();
    });

    it("lists keys without exposing secrets", async () => {
      await generateApiKey({
        userId: testUserId,
        name: "Test Agent For Listing",
      });
      const keys = await listApiKeys(testUserId);
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) {
        expect(k.prefix).toBeDefined();
        // Secrets are never stored or returned in row
        expect((k as any).token).toBeUndefined();
        expect((k as any).secret).toBeUndefined();
      }
    });

    it("revokes key successfully and rejects subsequent verification", async () => {
      const generated = await generateApiKey({
        userId: testUserId,
        name: "Revocation Candidate",
      });

      // Verify it's initially valid
      const initialVerify = await verifyApiKey(generated.token);
      expect(initialVerify).not.toBeNull();

      // Revoke the key
      const revoked = await revokeApiKey({
        userId: testUserId,
        keyId: generated.id,
      });
      expect(revoked).toBe(true);

      // Verify it is now rejected
      const postRevokeVerify = await verifyApiKey(generated.token);
      expect(postRevokeVerify).toBeNull();
    });

    it("verifies timingSafeEqual verification during token check", async () => {
      const timingSafeEqualSpy = vi.spyOn(crypto, "timingSafeEqual");

      const generated = await generateApiKey({
        userId: testUserId,
        name: "Timing Safe Candidate",
      });

      const verifyResult = await verifyApiKey(generated.token);
      expect(verifyResult).not.toBeNull();
      expect(timingSafeEqualSpy).toHaveBeenCalled();

      timingSafeEqualSpy.mockRestore();
    });
  });
});
