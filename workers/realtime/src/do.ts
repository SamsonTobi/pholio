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
      const body = await request.text();
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
