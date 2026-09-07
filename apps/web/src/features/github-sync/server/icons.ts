export interface IconResolutionInput {
  repoRootFiles: string[];
  manifestIcons?: Array<{ src: string; sizes?: string }>;
  liveUrl?: string;
  mobileMarkers?: {
    hasAndroidLauncher?: boolean;
    androidIconPath?: string;
    hasIosAppIcon?: boolean;
    iosIconPath?: string;
    expoIconPath?: string;
    flutterIconPath?: string;
  };
  ownerAvatarUrl?: string;
  githubRepoId: number;
}

export interface ResolvedIcon {
  source: "root_file" | "manifest" | "favicon" | "mobile" | "owner_avatar" | "initial_tile";
  url: string;
}

export function deterministicHue(id: number): number {
  return (id * 137.508) % 360;
}

export function resolveProjectIcon(input: IconResolutionInput): ResolvedIcon {
  // 1. Explicit root files
  const explicitRootFiles = [
    "logo.png",
    "logo.svg",
    "icon.png",
    "icon.svg",
    "app-icon.png",
  ];

  for (const candidate of explicitRootFiles) {
    if (input.repoRootFiles.some((f) => f.toLowerCase() === candidate)) {
      return {
        source: "root_file",
        url: `https://raw.githubusercontent.com/repo/main/${candidate}`,
      };
    }
  }

  // 2. Web manifest
  if (input.manifestIcons && input.manifestIcons.length > 0) {
    const largest = input.manifestIcons[input.manifestIcons.length - 1];
    return {
      source: "manifest",
      url: largest.src,
    };
  }

  // 3. Favicon from live URL
  if (input.liveUrl) {
    try {
      const url = new URL(input.liveUrl);
      return {
        source: "favicon",
        url: `${url.origin}/favicon.ico`,
      };
    } catch {
      // ignore
    }
  }

  // 4. Mobile markers (Android / iOS / Expo / Flutter)
  if (input.mobileMarkers) {
    if (input.mobileMarkers.androidIconPath) {
      return {
        source: "mobile",
        url: input.mobileMarkers.androidIconPath,
      };
    }
    if (input.mobileMarkers.iosIconPath) {
      return {
        source: "mobile",
        url: input.mobileMarkers.iosIconPath,
      };
    }
    if (input.mobileMarkers.expoIconPath) {
      return {
        source: "mobile",
        url: input.mobileMarkers.expoIconPath,
      };
    }
    if (input.mobileMarkers.flutterIconPath) {
      return {
        source: "mobile",
        url: input.mobileMarkers.flutterIconPath,
      };
    }
  }

  // 5. Owner / org avatar
  if (input.ownerAvatarUrl) {
    return {
      source: "owner_avatar",
      url: input.ownerAvatarUrl,
    };
  }

  // 6. Deterministic initial tile
  const hue = Math.round(deterministicHue(input.githubRepoId));
  return {
    source: "initial_tile",
    url: `https://api.dicebear.com/7.x/initials/svg?seed=${input.githubRepoId}&backgroundColor=hsl(${hue},70%,50%)`,
  };
}
