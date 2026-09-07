"use client";

import { useEffect, useRef } from "react";
import { REALTIME_URL } from "@/lib/env";

export interface RealtimeMessage {
  type: string;
  id?: string;
  updated_at?: string;
  [key: string]: unknown;
}

function toWebSocketUrl(base: string): string | null {
  const trimmed = (base || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") url.protocol = "wss:";
    else if (url.protocol === "http:") url.protocol = "ws:";
    else if (url.protocol !== "wss:" && url.protocol !== "ws:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * useRealtimeChannel connects to the Cloudflare Worker Durable Object WebSocket
 * for instant live updates. If the connection fails, callers should rely on
 * targeted per-query polling/refetch instead of a global interval.
 */
export function useRealtimeChannel(
  channel: string | null | undefined,
  onMessage?: (data: RealtimeMessage) => void
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!channel || typeof window === "undefined") return;

    const baseUrl = toWebSocketUrl(REALTIME_URL);
    if (!baseUrl) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[realtime] NEXT_PUBLIC_REALTIME_URL is not set or invalid; skipping WebSocket connect."
        );
      }
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let delay = 1000;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      try {
        const wsUrl = `${baseUrl}/subscribe?channel=${encodeURIComponent(
          channel!
        )}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          delay = 1000; // Reset backoff on successful connect
          // Periodic ping keepalive
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send("ping");
              } catch {
                // Ignore
              }
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === "pong") return;
            const parsed = JSON.parse(event.data);
            if (onMessageRef.current) {
              onMessageRef.current(parsed);
            }
          } catch {
            // Ignore non-JSON or heartbeat frames
          }
        };

        ws.onerror = () => {
          // Fall back silently to polling
          if (ws) ws.close();
        };

        ws.onclose = () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (!isMounted) return;
          // Exponential backoff up to 30s
          reconnectTimeout = setTimeout(() => {
            delay = Math.min(delay * 2, 30000);
            connect();
          }, delay);
        };
      } catch {
        // Fall back silently to polling
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.close();
        } catch {
          // Ignore
        }
      }
    };
  }, [channel]);
}
