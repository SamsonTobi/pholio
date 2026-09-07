import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import crypto from "crypto";

function verifySignature(body: string, signature: string | null, secret?: string): boolean {
  try {
    if (!signature) return false;
    if (!secret) {
      // Fail closed in production, allow only in non-production for local dev
      return process.env.NODE_ENV !== "production";
    }
    const hmac = crypto.createHmac("sha256", secret);
    const digest = `sha256=${hmac.update(body).digest("hex")}`;
    const digestBuf = Buffer.from(digest);
    const sigBuf = Buffer.from(signature);
    if (digestBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const bodyText = await request.text();
  if (bodyText.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  if (!verifySignature(bodyText, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(bodyText);

    if (event === "push" || event === "release") {
      const repoId = payload.repository?.id;
      const pushedTime = payload.repository?.pushed_at || new Date().toISOString();
      const commitSha = payload.after || payload.release?.tag_name;

      if (repoId) {
        const supabase = createAdminClient();
        const { data: project } = await (supabase.from("projects") as any)
          .select("id, owner_id, name")
          .eq("github_repo_id", repoId)
          .maybeSingle();

        if (project) {
          // Idempotency: skip duplicate delivery via commit_sha + project guard
          if (commitSha) {
            const { data: existing } = await (supabase.from("github_sync_events") as any)
              .select("id")
              .eq("project_id", project.id)
              .eq("commit_sha", commitSha)
              .maybeSingle();
            if (existing) {
              return NextResponse.json({ received: true, duplicate: true });
            }
          }

          await (supabase.from("projects") as any)
            .update({ last_push_at: pushedTime })
            .eq("id", project.id);

          const eventPayload: Record<string, unknown> = {
            project_id: project.id,
            owner_id: project.owner_id,
            event_type: event,
            pushed_at: pushedTime,
            commit_sha: commitSha,
          };
          // Record delivery id for idempotency when column exists
          if (deliveryId) {
            eventPayload.delivery_id = deliveryId;
          }
          const { error: eventError } = deliveryId
            ? await (supabase.from("github_sync_events") as any).upsert(eventPayload, {
                onConflict: "delivery_id",
                ignoreDuplicates: true,
              })
            : await (supabase.from("github_sync_events") as any).insert(eventPayload);
          // Unique violation means duplicate delivery — return fast
          if (eventError && (eventError.code === "23505" || eventError.message?.includes("duplicate"))) {
            return NextResponse.json({ received: true, duplicate: true });
          }

          // Auto-draft unpublished showcase, validate body 10..600 (skip if <10)
          const rawMsg: string =
            payload.head_commit?.message?.split("\n")[0] || `Pushed updates to ${project.name}`;
          const commitMsg = rawMsg.trim().substring(0, 600);
          if (commitMsg.length >= 10) {
            await (supabase.from("showcases") as any).insert({
              project_id: project.id,
              owner_id: project.owner_id,
              body: commitMsg,
              source: "github",
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook parse failed" }, { status: 400 });
  }
}
