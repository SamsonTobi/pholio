"use client";

import * as React from "react";
import { Bot, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SETUP_KEY_NAME = "Agent setup";

export function buildAgentSetupPrompt({
  token,
  appUrl,
}: {
  token: string;
  appUrl: string;
}): string {
  return `### Pholio agent setup (${appUrl.replace(/^https?:\/\//, "")})
API key: ${token}
MCP endpoint: ${appUrl}/api/mcp (header: Authorization: Bearer ${token})

Pholio is a self-maintaining showcase for product builders. It imports
your GitHub repositories as projects, tracks visitors per project, and
keeps a living showcase feed updated from your pushes — or from you,
the agent, via these MCP tools: update_project, publish_showcase,
sync_readme, upload_mockup, get_stats.

First-time setup — do this now:
1. List my Pholio projects (they were imported from GitHub).
2. For EACH project, look through the actual local repository code and
   write a better description: what it does, who it's for, and the most
   interesting technical detail. Keep it factual, hype-free, 1-3 sentences.
3. Show me every proposed description and WAIT for my approval.
4. Only after I approve, update each project using update_project.
   Never update or publish anything I haven't explicitly approved.`;
}

export function AgentSetupBanner({ appUrl }: { appUrl: string }) {
  const [status, setStatus] = React.useState<"idle" | "working" | "copied">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const handleCopySetup = async () => {
    setStatus("working");
    setError(null);
    try {
      // Retire previous unused setup keys so regenerating doesn't pile up.
      try {
        const listRes = await fetch("/api/agent-keys");
        if (listRes.ok) {
          const { keys } = await listRes.json();
          const stale = (keys || []).filter(
            (k: { id: string; name: string | null; last_used_at: string | null }) =>
              k.name === SETUP_KEY_NAME && !k.last_used_at
          );
          await Promise.all(
            stale.map((k: { id: string }) =>
              fetch(`/api/agent-keys?id=${encodeURIComponent(k.id)}`, { method: "DELETE" }).catch(
                () => null
              )
            )
          );
        }
      } catch {
        // Best-effort cleanup; never blocks key generation
      }

      const res = await fetch("/api/agent-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: SETUP_KEY_NAME }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Could not generate an agent key");
      }

      await navigator.clipboard.writeText(
        buildAgentSetupPrompt({ token: data.token, appUrl })
      );
      setStatus("copied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <Card className="border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
              Connect your coding agent
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Works with all coding agents — Codex, Claude, Antigravity, OpenCode,
              Cursor, Copilot, Windsurf, and any MCP-capable assistant.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Paste the setup prompt into your agent to link it to Pholio. It will
              review your imported GitHub projects, propose better descriptions
              for your approval, and keep your showcase updated when you ship.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleCopySetup} disabled={status === "working"}>
                {status === "working" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : status === "copied" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy setup prompt
                  </>
                )}
              </Button>
              <a
                href="/docs/agent"
                className="text-[11px] font-medium text-neutral-500 underline underline-offset-4 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                View full agent docs
              </a>
            </div>

            {status === "copied" && (
              <p className="mt-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Copied with a live API key included — store it in your agent&apos;s
                MCP config now, it won&apos;t be shown again.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-[11px] text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
              Waiting for first agent connection… this banner disappears once your
              agent makes its first call.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
