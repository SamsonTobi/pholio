import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/features/notifications/server/service";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || DEMO_USER_ID;

    const notifications = await listNotifications(userId);
    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || DEMO_USER_ID;

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
