import { describe, it, expect } from "vitest";
import { validateMockupFile, sortMockups } from "./service";

describe("Mockups feature", () => {
  describe("File validation", () => {
    it("accepts valid png, jpeg, webp, and svg under 5MB", () => {
      expect(validateMockupFile("image/png", 1024 * 1024)).toBe(true);
      expect(validateMockupFile("image/jpeg", 2 * 1024 * 1024)).toBe(true);
      expect(validateMockupFile("image/webp", 3 * 1024 * 1024)).toBe(true);
      expect(validateMockupFile("image/svg+xml", 500 * 1024)).toBe(true);
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
