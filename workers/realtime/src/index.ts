import { RealtimeRoom } from "./do";

export { RealtimeRoom };

export interface Env {
  REALTIME_ROOM: DurableObjectNamespace;
  FANOUT_SECRET?: string;
  APP_URL?: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Constant-time secret comparison. Uses crypto.subtle.timingSafeEqual when
 * available (Workers runtime), otherwise falls back to a manual XOR loop
 * that does not short-circuit on first mismatch.
 */
function secretsEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  try {
    const subtle = (crypto as unknown as {
      subtle?: { timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean };
    }).subtle;
    if (subtle?.timingSafeEqual) {
      return subtle.timingSafeEqual(ab, bb);
    }
  } catch {
    // fall through to manual compare
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i]! ^ bb[i]!;
  }
  return diff === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json(200, { ok: true });
    }

    if (url.pathname === "/fanout" && request.method === "POST") {
      // Fail closed: no dev-secret fallback. Configure via `wrangler secret put FANOUT_SECRET`.
      if (!env.FANOUT_SECRET) {
        console.error("FANOUT_SECRET is not configured");
        return json(500, { error: "Server misconfigured" });
      }

      const secret = request.headers.get("x-fanout-secret") ?? "";
      if (!secretsEqual(secret, env.FANOUT_SECRET)) {
        return json(401, { error: "Unauthorized" });
      }

      let body: { channel?: string; payload?: unknown };
      try {
        body = (await request.json()) as { channel?: string; payload?: unknown };
      } catch {
        return json(400, { error: "Invalid JSON body" });
      }

      if (!body.channel || typeof body.channel !== "string") {
        return json(400, { error: "Missing channel" });
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

      // NOTE: channels are currently public (showcase:{slug}, hacker-group:{id}).
      // Private groups should sign /subscribe (HMAC of channel + expiry with
      // FANOUT_SECRET) or gate via the web app before handing out the WS URL.
      const id = env.REALTIME_ROOM.idFromName(channel);
      const room = env.REALTIME_ROOM.get(id);
      return room.fetch(new Request("http://do/websocket", {
        headers: request.headers,
      }));
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Scheduled keepalive ping
  },
};
