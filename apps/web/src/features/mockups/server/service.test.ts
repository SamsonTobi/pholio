import { describe, it, expect } from "vitest";
import { validateMockupFile, sortMockups } from "./service";

describe("Mockups feature", () => {
  describe("File validation", () => {
    it("accepts valid png, jpeg, and webp under 5MB", () => {
      expect(validateMockupFile("image/png", 1024 * 1024)).toBe(true);
      expect(validateMockupFile("image/jpeg", 2 * 1024 * 1024)).toBe(true);
      expect(validateMockupFile("image/webp", 3 * 1024 * 1024)).toBe(true);
    });

    it("rejects svg (disallowed: png/jpeg/webp only)", () => {
      expect(() =>
        validateMockupFile("image/svg+xml", 500 * 1024)
      ).toThrow("Unsupported file type");
    });

    it("rejects content that does not match declared mime type", () => {
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(() => validateMockupFile("image/jpeg", pngBytes.length, pngBytes)).toThrow(
        "does not match"
      );
      expect(validateMockupFile("image/png", pngBytes.length, pngBytes)).toBe(true);
    });

    it("rejects files exceeding 5MB limit", () => {
      expect(() =>
        validateMockupFile("image/png", 6 * 1024 * 1024)
      ).toThrow("exceeds 5MB limit");
    });

    it("rejects unsupported file mime types", () => {
      expect(() =>
        validateMockupFile("application/pdf", 1024)
      ).toThrow("Unsupported file type");
    });
  });

  describe("Mockup sort", () => {
    it("sorts mockups by sort index ascending", () => {
      const items = [
        { id: "m3", sort: 2 },
        { id: "m1", sort: 0 },
        { id: "m2", sort: 1 },
      ];

      const sorted = sortMockups(items);
      expect(sorted.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    });

    it("breaks ties with deterministic id sorting", () => {
      const items = [
        { id: "b", sort: 1 },
        { id: "a", sort: 1 },
      ];

      const sorted = sortMockups(items);
      expect(sorted.map((m) => m.id)).toEqual(["a", "b"]);
    });
  });
});
