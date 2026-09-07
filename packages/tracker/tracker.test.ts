import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { gzipSync } from "zlib";

describe("Tracker Size & Privacy Invariants", () => {
  const sourcePath = join(__dirname, "tracker.ts");
  const distPath = join(__dirname, "dist", "tracker.js");

  it("ensures tracker source contains zero cookie references (privacy guarantee)", () => {
    const sourceCode = readFileSync(sourcePath, "utf-8");
    expect(sourceCode).not.toContain("document.cookie");
    expect(sourceCode).not.toContain("Cookie");
    expect(sourceCode).toContain("sessionStorage");
  });

  it("asserts compiled and minified tracker is strictly under 1KB gzipped", () => {
    const minified = readFileSync(distPath);
    const gzipped = gzipSync(minified);

    expect(gzipped.length).toBeLessThan(1024);
    // Log the exact gzipped byte size for transparency
    console.log(`Tracker gzipped size: ${gzipped.length} bytes (budget: < 1024 bytes)`);
  });
});
