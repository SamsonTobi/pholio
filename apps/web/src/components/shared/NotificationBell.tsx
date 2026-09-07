"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  TrendingUp,
  GitCommit,
  Sparkles,
  UserPlus,
  Check,
  CheckCheck,
} from "lucide-react";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { cn } from "@/lib/utils";

export interface NotificationPayload {
  title?: string;
  message?: string;
  url?: string;
  group_name?: string;
  group_slug?: string;
  actor_name?: string;
  spike_percentage?: number;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: "digest" | "spike" | "peer_push" | "invite";
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        throw new Error("Failed to load notifications.");
      }
      const data = await res.json();
      if (data.notifications && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
      setLoadError("Couldn't load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Click outside to close
  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAsRead = async (id: string, url?: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Ignore network errors
    }

    if (url) {
      setOpen(false);
      router.push(url);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Ignore network errors
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "spike":
        return <TrendingUp className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />;
      case "peer_push":
        return <GitCommit className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />;
      case "digest":
        return <Sparkles className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />;
      case "invite":
        return <UserPlus className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />;
      default:
        return <Bell className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white shadow-xs dark:bg-white dark:text-neutral-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-neutral-200 bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden dark:border-neutral-800 dark:bg-neutral-950">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800/80">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900">
            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                Loading notifications...
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="py-8 px-4 text-center text-xs text-neutral-500 dark:text-neutral-400"
              >
                {loadError}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markAsRead(n.id, n.payload.url)}
                    aria-label={`${n.payload.title || "Notification"}${isUnread ? " (unread)" : ""}`}
                    className={cn(
                      "group flex w-full cursor-pointer items-start gap-3 p-3.5 text-left transition-colors",
                      isUnread
                        ? "bg-neutral-50/70 hover:bg-neutral-100/70 dark:bg-neutral-900/60 dark:hover:bg-neutral-900"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                    )}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn(
                          "text-xs truncate",
                          isUnread
                            ? "font-semibold text-neutral-950 dark:text-neutral-50"
                            : "font-medium text-neutral-700 dark:text-neutral-300"
                        )}>
                          {n.payload.title || "Notification"}
                        </p>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {n.payload.message}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        <TimeAgo
                          date={n.created_at}
                          className="text-[10px] text-neutral-400 dark:text-neutral-500"
                        />
                        {n.payload.group_name && (
                          <>
                            <span className="text-[10px] text-neutral-300 dark:text-neutral-700">•</span>
                            <span className="text-[10px] text-neutral-500 font-medium dark:text-neutral-400">
                              {n.payload.group_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
