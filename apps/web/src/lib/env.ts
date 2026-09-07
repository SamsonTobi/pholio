import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_TRACKER_URL: z.string().url().default("http://localhost:3000/tracker.js"),
  NEXT_PUBLIC_REALTIME_URL: z.string().default("wss://localhost:8787"),
  REALTIME_FANOUT_SECRET: z.string().default("dev-secret"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_TRACKER_URL: process.env.NEXT_PUBLIC_TRACKER_URL,
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
    REALTIME_FANOUT_SECRET: process.env.REALTIME_FANOUT_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = parseEnv();

export const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
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
