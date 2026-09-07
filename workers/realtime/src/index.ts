import { RealtimeRoom } from "./do";

export { RealtimeRoom };

export interface Env {
  REALTIME_ROOM: DurableObjectNamespace;
  FANOUT_SECRET?: string;
  APP_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, status: "healthy" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/fanout" && request.method === "POST") {
      const secret = request.headers.get("x-fanout-secret");
      const expectedSecret = env.FANOUT_SECRET || "dev-secret";

      if (secret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      let body: { channel?: string; payload?: unknown };
      try {
        body = (await request.json()) as { channel?: string; payload?: unknown };
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.channel) {
        return new Response(JSON.stringify({ error: "Missing channel" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = env.REALTIME_ROOM.idFromName(body.channel);
      const room = env.REALTIME_ROOM.get(id);

      return room.fetch(new Request("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify(body.payload ?? {}),
        headers: { "Content-Type": "application/json" },
      }));
    }

    if (url.pathname === "/subscribe") {
      const channel = url.searchParams.get("channel");
      if (!channel) {
        return new Response("Missing channel parameter", { status: 400 });
      }

      const id = env.REALTIME_ROOM.idFromName(channel);
      const room = env.REALTIME_ROOM.get(id);
      return room.fetch(new Request("http://do/websocket", {
        headers: request.headers,
      }));
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Scheduled keepalive ping
  },
};
