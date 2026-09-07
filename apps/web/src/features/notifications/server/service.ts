import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { Database } from "@/lib/supabase/types";

export type NotificationType = "digest" | "spike" | "peer_push" | "invite";

export interface NotificationPayload {
  title?: string;
  message?: string;
  url?: string;
  group_id?: string;
  group_name?: string;
  group_slug?: string;
  actor_name?: string;
  spike_percentage?: number;
  actives_7d?: number;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

let DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    user_id: "00000000-0000-0000-0000-000000000001",
    type: "spike",
    payload: {
      title: "Growth spike detected",
      message: "Pholio experienced a +45% increase in 7-day active visitors.",
      url: "/dashboard/projects",
      spike_percentage: 45,
    },
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "notif-2",
    user_id: "00000000-0000-0000-0000-000000000001",
    type: "peer_push",
    payload: {
      title: "Peer pushed update",
      message: "Siddharth pushed 4 commits to pholio (main branch).",
      url: "/hacker-groups/lagos-hackers",
      actor_name: "Siddharth Arun",
    },
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "notif-3",
    user_id: "00000000-0000-0000-0000-000000000001",
    type: "digest",
    payload: {
      title: "Weekly leaderboard digest",
      message: "Lagos Hackers standings updated. You held #1 this week!",
      url: "/hacker-groups/lagos-hackers",
      group_name: "Lagos Hackers",
      group_slug: "lagos-hackers",
    },
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "notif-4",
    user_id: "00000000-0000-0000-0000-000000000001",
    type: "invite",
    payload: {
      title: "Group invite received",
      message: "You have been invited to join YC W26 Builders.",
      url: "/hacker-groups/yc-w26",
      group_name: "YC W26 Builders",
      group_slug: "yc-w26",
    },
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

function isSupabaseLive(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

const isProd = () => process.env.NODE_ENV === "production";

/**
 * Looks up a user's login email via the admin API (profiles carry no email).
 * Returns null when unavailable — callers treat email as best-effort.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  // Offline fast path: never hit the network without a linked backend.
  if (!isSupabaseLive()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return data.user.email;
  } catch {
    return null;
  }
}

/**
 * Lists notifications for a user ordered by created_at desc with a limit of 50.
 */
export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      return data as NotificationItem[];
    }
    if (error) throw new Error(error.message);
  } catch (err) {
    if (isSupabaseLive() || isProd()) throw err instanceof Error ? err : new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only) — scoped to the caller's own id
  // so one user never sees another user's rows.
  return DEMO_NOTIFICATIONS.filter((n) => n.user_id === userId).slice(0, 50);
}

/**
 * Marks a notification as read (updates read_at = now()).
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<NotificationItem | null> {
  const readTimestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("notifications") as any)
      .update({ read_at: readTimestamp })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as NotificationItem;
    }
    if (error) throw new Error(error.message);
  } catch (err) {
    if (isSupabaseLive() || isProd()) throw err instanceof Error ? err : new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only)
  const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
  if (notif) {
    if (notif.user_id !== userId) return null;
    notif.read_at = readTimestamp;
    return notif;
  }

  return null;
}

export const markNotificationAsRead = markNotificationRead;

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const readTimestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { error } = await (supabase.from("notifications") as any)
      .update({ read_at: readTimestamp })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
  } catch (err) {
    if (isSupabaseLive() || isProd()) throw err instanceof Error ? err : new Error("Service unavailable");
  }

  // Offline demo fallback (dev/test only) — scope to caller
  DEMO_NOTIFICATIONS.forEach((n) => {
    if (n.user_id === userId && !n.read_at) n.read_at = readTimestamp;
  });

  return true;
}

/**
 * Creates a notification using the admin client (service_role required by RLS).
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
}): Promise<NotificationItem> {
  // Offline fast path: never hit the network without a linked backend.
  if (!isSupabaseLive()) {
    return createDemoNotification(params);
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await (admin.from("notifications") as any)
      .insert({
        user_id: params.userId,
        type: params.type,
        payload: params.payload,
      })
      .select()
      .single();

    if (!error && data) {
      return data as NotificationItem;
    }
    throw new Error(error?.message || "Failed to create notification");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Service unavailable");
  }
}

function createDemoNotification(params: {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
}): NotificationItem {

  // Offline demo fallback (dev/test only)

  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: params.userId,
    type: params.type,
    payload: params.payload,
    read_at: null,
    created_at: new Date().toISOString(),
  };

  DEMO_NOTIFICATIONS.unshift(newNotif);
  return newNotif;
}
