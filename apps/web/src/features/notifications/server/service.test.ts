import { describe, it, expect } from "vitest";
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
} from "./service";

describe("Notifications service", () => {
  const testUserId = "00000000-0000-0000-0000-000000000001";

  it("lists notifications including digest, spike, peer_push, and invite types", async () => {
    const notifs = await listNotifications(testUserId);
    expect(notifs.length).toBeGreaterThanOrEqual(4);

    const types = new Set(notifs.map((n) => n.type));
    expect(types.has("spike")).toBe(true);
    expect(types.has("peer_push")).toBe(true);
    expect(types.has("digest")).toBe(true);
    expect(types.has("invite")).toBe(true);
  });

  it("marks a notification as read", async () => {
    const notifs = await listNotifications(testUserId);
    const unread = notifs.find((n) => !n.read_at);
    expect(unread).toBeDefined();

    const updated = await markNotificationAsRead(unread!.id, testUserId);
    expect(updated?.read_at).not.toBeNull();
  });

  it("marks all notifications as read", async () => {
    await markAllNotificationsAsRead(testUserId);
    const notifs = await listNotifications(testUserId);
    const unreadCount = notifs.filter((n) => !n.read_at).length;
    expect(unreadCount).toBe(0);
  });

  it("creates a new notification", async () => {
    const created = await createNotification({
      userId: testUserId,
      type: "spike",
      payload: {
        title: "Test Spike",
        message: "Stats increased by 50%",
        spike_percentage: 50,
      },
    });

    expect(created.id).toBeDefined();
    expect(created.type).toBe("spike");
    expect(created.payload.title).toBe("Test Spike");
  });
});
