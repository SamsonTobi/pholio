import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/features/notifications/server/service";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const notifications = await listNotifications(userId);
    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/notifications/route.ts:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const json = await request.json().catch(() => ({}));

    if (json.all) {
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true });
    }

    if (json.id) {
      const updated = await markNotificationAsRead(json.id, userId);
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json(
      { error: "Missing notification id or all flag" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api] internal error in apps/web/src/app/api/notifications/route.ts:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
