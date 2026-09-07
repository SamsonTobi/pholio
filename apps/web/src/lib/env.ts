import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
const isBrowser = typeof window !== "undefined";

function normalizeUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  // Tolerate bare domains pasted without a scheme (e.g. "pholio.cc").
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function ensureValidUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    new URL(value);
    return value;
  } catch {
    return fallback;
  }
}

function safeHostname(url: string, fallback: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return fallback;
  }
}

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_TRACKER_URL: z.string().url().default("http://localhost:3000/tracker.js"),
  NEXT_PUBLIC_REALTIME_URL: z.string().default("wss://localhost:8787"),
  REALTIME_FANOUT_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  SUPABASE_AUTH_CALLBACK_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  PHOLIO_BASE_URL: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),
});

function readRawEnv() {
  return {
    NEXT_PUBLIC_APP_URL: normalizeUrl(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_TRACKER_URL: normalizeUrl(process.env.NEXT_PUBLIC_TRACKER_URL),
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
    REALTIME_FANOUT_SECRET: process.env.REALTIME_FANOUT_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
    SUPABASE_AUTH_CALLBACK_URL: process.env.SUPABASE_AUTH_CALLBACK_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    PHOLIO_BASE_URL: normalizeUrl(process.env.PHOLIO_BASE_URL),
    CRON_SECRET: process.env.CRON_SECRET,
  };
}

function browserFallback() {
  // The browser bundle never carries server-only vars and must never crash
  // the page: return best-effort values, validated strictly server-side.
  const defaults = envSchema.parse({});
  const raw = readRawEnv();
  const defined = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== undefined)
  );
  return { ...defaults, ...defined };
}

function parseEnv() {
  const parsed = envSchema.safeParse(readRawEnv());

  if (!parsed.success) {
    if (isBrowser) return browserFallback();
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  const data = parsed.data;

  // Fail fast on the server only. The browser bundle (non-NEXT_PUBLIC_ vars
  // stripped) must never throw or every page becomes a client exception.
  if (isProd && !isBrowser) {
    const missing: string[] = [];
    const isPlaceholder = (v?: string) =>
      !v || v.includes("placeholder") || v.includes("localhost") || v.length < 16;

    if (isPlaceholder(data.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (isPlaceholder(data.NEXT_PUBLIC_SUPABASE_ANON_KEY)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (isPlaceholder(data.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    if (data.NEXT_PUBLIC_APP_URL.includes("localhost")) {
      missing.push("NEXT_PUBLIC_APP_URL (must not be localhost in production)");
    }

    if (missing.length > 0) {
      throw new Error(`Missing or placeholder env vars in production: ${missing.join(", ")}`);
    }
  }

  return data;
}

export const env = parseEnv();

const FALLBACK_APP_URL = "http://localhost:3000";

export const APP_URL = ensureValidUrl(env.NEXT_PUBLIC_APP_URL, FALLBACK_APP_URL).replace(
  /\/+$/,
  ""
);
export const BASE_URL = ensureValidUrl(
  env.PHOLIO_BASE_URL ?? env.NEXT_PUBLIC_APP_URL,
  FALLBACK_APP_URL
).replace(/\/+$/, "");
export const RESEND_FROM = env.RESEND_FROM ?? `notifications@${safeHostname(APP_URL, "localhost")}`;
export const SUPABASE_JWKS_URL = env.SUPABASE_JWKS_URL;
export const SUPABASE_AUTH_CALLBACK_URL = env.SUPABASE_AUTH_CALLBACK_URL;
export const TRACKER_URL = env.NEXT_PUBLIC_TRACKER_URL;
export const NEXT_PUBLIC_TRACKER_URL = env.NEXT_PUBLIC_TRACKER_URL;
export const REALTIME_URL = env.NEXT_PUBLIC_REALTIME_URL;

export function showcaseUrl(slug: string): string {
  return `${APP_URL}/${slug}`;
}

export function inviteUrl(token: string): string {
  return `${APP_URL}/hacker-groups/join/${token}`;
}

export function projectDeepUrl(userSlug: string, projectSlug: string): string {
  return `${APP_URL}/${userSlug}/${projectSlug}`;
}
