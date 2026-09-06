import { RealtimeRoom } from "./do";

export { RealtimeRoom };

export interface Env {
  REALTIME_ROOM: DurableObjectNamespace;
  FANOUT_SECRET: string;
  APP_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, app: env.APP_URL }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/fanout" && request.method === "POST") {
      const secret = request.headers.get("x-fanout-secret");
      if (secret !== env.FANOUT_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const body = await request.json() as { channel: string; payload: unknown };
      if (!body.channel) {
        return new Response("Missing channel", { status: 400 });
      }

      const id = env.REALTIME_ROOM.idFromName(body.channel);
      const room = env.REALTIME_ROOM.get(id);
      return room.fetch(new Request("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify(body.payload),
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
};
