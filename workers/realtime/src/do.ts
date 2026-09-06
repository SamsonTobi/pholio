export class RealtimeRoom {
  state: DurableObjectState;
  sessions: WebSocket[];

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/websocket") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      this.sessions.push(server);

      server.addEventListener("close", () => {
        this.sessions = this.sessions.filter((s) => s !== server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const body = await request.text();
      for (const session of this.sessions) {
        try {
          session.send(body);
        } catch {
          // Ignore failed send
        }
      }
      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
}
