import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Push-webhook `repository.pushed_at` is typed `number | string | null`
 * (epoch seconds in push deliveries, ISO string from the REST API), so it
 * must be normalized before writing to the timestamptz column. Prefer
 * `head_commit.timestamp` — the authoritative time of the push.
 */
function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value; // epoch seconds vs millis
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function resolvePushedAt(payload: any): string {
  const candidates = [
    payload.head_commit?.timestamp,
    payload.repository?.pushed_at,
    payload.release?.published_at,
    payload.repository?.created_at,
    payload.repository?.updated_at,
  ];
  for (const candidate of candidates) {
    const iso = toIsoTimestamp(candidate);
    if (iso) return iso;
  }
  return new Date().toISOString();
}

interface RepoActor {
  id?: number | null;
  login?: string | null;
}

/**
 * Resolve the Pholio owner for an incoming repo payload. Prefer the sender
 * (the user who created/pushed), fall back to the repository owner. Matches
 * `profiles` by `github_id` first, then case-insensitive `github_username`.
 * Returns null when the actor has no Pholio account.
 */
async function resolveOwnerId(
  supabase: ReturnType<typeof createAdminClient>,
  sender: RepoActor | null,
  repoOwner: RepoActor | null
): Promise<string | null> {
  const candidates: RepoActor[] = [sender, repoOwner].filter(Boolean) as RepoActor[];
  for (const actor of candidates) {
    if (actor?.id) {
      const { data } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("github_id", actor.id)
        .maybeSingle();
      if (data?.id) return data.id as string;
    }
    if (actor?.login) {
      const { data } = await (supabase.from("profiles") as any)
        .select("id")
        .ilike("github_username", actor.login)
        .maybeSingle();
      if (data?.id) return data.id as string;
    }
  }
  return null;
}

function toSyncRepoInput(repository: any, pushedAt: string) {
  return {
    id: repository.id,
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description ?? null,
    html_url: repository.html_url,
    homepage: repository.homepage ?? null,
    stargazers_count: repository.stargazers_count ?? 0,
    language: repository.language ?? null,
    pushed_at: pushedAt,
    private: repository.private ?? false,
    fork: repository.fork ?? false,
    archived: repository.archived ?? false,
    topics: repository.topics ?? undefined,
    owner: repository.owner?.avatar_url ? { avatar_url: repository.owner.avatar_url } : null,
  };
}

/**
 * Auto-import a repo the first time Pholio sees it — runs the same shared
 * creation path as manual import (README summary, icon, telemetry slug,
 * initial showcase draft, sync event). Skips private/fork/archived repos:
 * private needs an explicit opt-in via pick-repos, forks/archived match the
 * manual import filter.
 */
async function autoImportUntrackedRepo(
  supabase: ReturnType<typeof createAdminClient>,
  payload: any,
  eventType: "import" | "push" | "release",
  deliveryId: string | null
): Promise<NextResponse> {
  const repository = payload.repository;
  const repoId = repository?.id;
  if (!repoId || !repository?.name || !repository?.full_name) {
    console.warn(`[webhook:github] ${eventType} delivery ${deliveryId ?? "unknown"} missing repository fields; ignoring`);
    return NextResponse.json({ received: true, ignored: "unknown-repository" });
  }

  if (repository.fork === true || repository.archived === true) {
    return NextResponse.json({ received: true, ignored: "skipped-repo" });
  }
  if (repository.private === true) {
    return NextResponse.json({ received: true, ignored: "private-requires-opt-in" });
  }

  const ownerId = await resolveOwnerId(supabase, payload.sender, repository.owner);
  if (!ownerId) {
    console.warn(`[webhook:github] ${eventType} delivery ${deliveryId ?? "unknown"} for repo ${repository.full_name}: no linked Pholio account; ignoring`);
    return NextResponse.json({ received: true, ignored: "unknown-owner" });
  }

  const { upsertProjectFromRepo } = await import("@/features/github-sync/server/service");
  const pushedAt = resolvePushedAt(payload);
  const project = await upsertProjectFromRepo(
    ownerId,
    toSyncRepoInput(repository, pushedAt),
    eventType,
    supabase as any
  );

  if (!project) {
    return NextResponse.json({ error: "Auto-import failed" }, { status: 500 });
  }

  console.info(`[webhook:github] auto-imported ${repository.full_name} for owner ${ownerId} (delivery ${deliveryId ?? "unknown"})`);
  return NextResponse.json({ received: true, auto_imported: project.id });
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

    // New repo created on GitHub (org-level or account-level webhook):
    // auto-import it with the same process as manual import.
    if (event === "repository" && payload.action === "created") {
      const supabase = createAdminClient();
      return autoImportUntrackedRepo(supabase, payload, "import", deliveryId);
    }
    // Ignore other repository actions (deleted, archived, privatized, etc.)
    if (event === "repository") {
      return NextResponse.json({ received: true, ignored: `repository-${payload.action ?? "event"}` });
    }

    // GitHub ping on webhook install — confirm receipt.
    if (event === "ping") {
      return NextResponse.json({ received: true, ping: true });
    }

    if (event === "push" || event === "release") {
      const repoId = payload.repository?.id;
      const pushedTime = resolvePushedAt(payload);
      const commitSha = payload.after || payload.release?.tag_name;

      if (!repoId) {
        console.warn(`[webhook:github] ${event} delivery ${deliveryId ?? "unknown"} missing repository.id; ignoring`);
        return NextResponse.json({ received: true, ignored: "unknown-repository" });
      }

      // Branch deletions carry no new code state; record nothing.
      if (event === "push" && payload.deleted === true) {
        return NextResponse.json({ received: true, ignored: "branch-deleted" });
      }

      {
        const supabase = createAdminClient();
        const { data: project } = await (supabase.from("projects") as any)
          .select("id, owner_id, name")
          .eq("github_repo_id", repoId)
          .maybeSingle();

        // First push to a repo Pholio hasn't seen yet (e.g. repository
        // event missed): run the same auto-import as a new repo instead of
        // dropping the event.
        if (!project) {
          return autoImportUntrackedRepo(supabase, payload, event, deliveryId);
        }

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

        const { error: pushError } = await (supabase.from("projects") as any)
          .update({ last_push_at: pushedTime })
          .eq("id", project.id);
        if (pushError) {
          console.error(`[webhook:github] failed to update last_push_at for project ${project.id} (delivery ${deliveryId ?? "unknown"}):`, pushError.message);
          return NextResponse.json({ error: "Project update failed" }, { status: 500 });
        }

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
        if (eventError) {
          console.error(`[webhook:github] failed to record sync event for project ${project.id} (delivery ${deliveryId ?? "unknown"}):`, eventError.message);
        }

        // Auto-draft unpublished showcase, validate body 10..600 (skip if <10)
        const rawMsg: string =
          payload.head_commit?.message?.split("\n")[0] || `Pushed updates to ${project.name}`;
        const commitMsg = rawMsg.trim().substring(0, 600);
        if (commitMsg.length >= 10) {
          const { error: showcaseError } = await (supabase.from("showcases") as any).insert({
            project_id: project.id,
            owner_id: project.owner_id,
            body: commitMsg,
            source: "github",
          });
          if (showcaseError) {
            console.error(`[webhook:github] failed to draft showcase for project ${project.id} (delivery ${deliveryId ?? "unknown"}):`, showcaseError.message);
          }
        }

        console.info(`[webhook:github] ${event} for ${project.name} recorded at ${pushedTime} (delivery ${deliveryId ?? "unknown"})`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook:github] payload handling failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Webhook parse failed" }, { status: 400 });
  }
}
