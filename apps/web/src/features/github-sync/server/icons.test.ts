import { describe, it, expect } from "vitest";
import { resolveProjectIcon } from "./icons";

describe("resolveProjectIcon", () => {
  it("fixture 1: web-only with root logo file", () => {
    const icon = resolveProjectIcon({
      repoRootFiles: ["README.md", "package.json", "logo.svg"],
      githubRepoId: 101,
    });
    expect(icon.source).toBe("root_file");
    expect(icon.url).toContain("logo.svg");
  });

  it("fixture 2: expo mobile app with app.json icon", () => {
    const icon = resolveProjectIcon({
      repoRootFiles: ["app.json", "package.json"],
      mobileMarkers: {
        expoIconPath: "https://raw.githubusercontent.com/user/repo/main/assets/icon.png",
      },
      githubRepoId: 102,
    });
    expect(icon.source).toBe("mobile");
    expect(icon.url).toContain("assets/icon.png");
  });

  it("fixture 3: native android/ios markers", () => {
    const icon = resolveProjectIcon({
      repoRootFiles: ["android/", "ios/"],
      mobileMarkers: {
        androidIconPath: "https://raw.githubusercontent.com/user/repo/main/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
      },
      githubRepoId: 103,
    });
    expect(icon.source).toBe("mobile");
    expect(icon.url).toContain("ic_launcher.png");
  });

  it("fixture 4: no-icon fallback generates deterministic initial tile", () => {
    const icon1 = resolveProjectIcon({
      repoRootFiles: ["main.py", "requirements.txt"],
      githubRepoId: 404,
    });
    const icon2 = resolveProjectIcon({
      repoRootFiles: ["main.py", "requirements.txt"],
      githubRepoId: 404,
    });
    expect(icon1.source).toBe("initial_tile");
    expect(icon1.url).toContain("dicebear");
    expect(icon1.url).toBe(icon2.url);
  });
});
