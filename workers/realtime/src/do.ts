// NOTE: This Durable Object uses in-memory `sessions`. On hibernation/eviction
// the socket list is dropped and clients reconnect via exponential backoff in
// `useRealtimeChannel`. For full hibernation support, use
// `state.setHibernatableWebSocketEventTarget` + `state.getWebSockets()` and
// re-attach handlers in the constructor instead of this.sessions array.
//
// NOTE: per-IP throttling is not enforced here (single connection cap per
// room only). Enforce per-IP limits at the Worker edge (`/subscribe`) with a
// shared store (e.g. Workers KV / Rate Limit API) before routing to the DO.

export interface RealtimePayload {
  type: string;
  id: string;
  updated_at: string;
  [key: string]: unknown;
}

function isValidBroadcastPayload(value: unknown): value is RealtimePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.type === "string" &&
    v.type.length >= 1 &&
    v.type.length <= 64 &&
    typeof v.id === "string" &&
    v.id.length >= 1 &&
    v.id.length <= 128 &&
    typeof v.updated_at === "string" &&
    !Number.isNaN(Date.parse(v.updated_at))
  );
}

export class RealtimeRoom {
  state: DurableObjectState;
  sessions: WebSocket[];
  maxConnections: number = 100;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket" || url.pathname === "/subscribe") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      if (this.sessions.length >= this.maxConnections) {
        return new Response("Room connection limit reached", { status: 429 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      this.sessions.push(server);

      server.addEventListener("close", () => {
        this.sessions = this.sessions.filter((s) => s !== server);
      });

      server.addEventListener("error", () => {
        this.sessions = this.sessions.filter((s) => s !== server);
      });

      // Handle ping/pong heartbeat
      server.addEventListener("message", (event) => {
        try {
          if (event.data === "ping") {
            server.send("pong");
          }
        } catch {
          // Ignore
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      let payload: unknown;
      try {
        payload = JSON.parse(await request.text());
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!isValidBroadcastPayload(payload)) {
        return new Response(
          JSON.stringify({ error: "Invalid payload shape: expected {type, id, updated_at}" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const body = JSON.stringify(payload);
      const activeSessions: WebSocket[] = [];

      for (const session of this.sessions) {
        try {
          session.send(body);
          activeSessions.push(session);
        } catch {
          // Dead connection, exclude
        }
      }

      this.sessions = activeSessions;
      return new Response(JSON.stringify({ ok: true, delivered: activeSessions.length }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
