import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function verifySignature(body: string, signature: string | null, secret?: string): boolean {
  if (!secret || !signature) return true; // allow in dev if secret is unset
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

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
          await (supabase.from("projects") as any)
            .update({ last_push_at: pushedTime })
            .eq("id", project.id);

          await (supabase.from("github_sync_events") as any).insert({
            project_id: project.id,
            owner_id: project.owner_id,
            event_type: event,
            pushed_at: pushedTime,
            commit_sha: commitSha,
          });

          // Auto-draft unpublished showcase
          const commitMsg = payload.head_commit?.message?.split("\n")[0] || `Pushed updates to ${project.name}`;
          await (supabase.from("showcases") as any).insert({
            project_id: project.id,
            owner_id: project.owner_id,
            body: commitMsg.substring(0, 600),
            source: "github",
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook parse failed" }, { status: 400 });
  }
}
