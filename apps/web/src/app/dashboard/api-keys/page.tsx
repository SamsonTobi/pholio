"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { APP_URL } from "@/lib/env";
import {
  Key,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Terminal,
  Shield,
  Trash2,
  ExternalLink,
  Bot,
  Laptop,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  scopes: string[];
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Generate Key Modal State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Secret Token Reveal Modal State
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Revocation State
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Quick instructions tab
  const [instructionTab, setInstructionTab] = useState<"cursor" | "claude" | "antigravity">("cursor");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/api-keys");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load API keys.");
      }
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setKeys([]);
      setLoadError(err instanceof Error ? err.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      setGenerateError(null);
      setActionError(null);
      const name = keyName.trim() || "Cursor IDE agent";
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes: ["showcase:write", "stats:read", "leaderboard:read"] }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate API key.");
      }
      const data = await res.json();
      if (!data.token) {
        throw new Error(
          "Key may have been created but the secret was not returned. Revoke any duplicate and recreate."
        );
      }
      const newKey: ApiKeyItem = data.key || {
        id: data.id,
        name: data.name,
        prefix: data.prefix,
        scopes: data.scopes || ["showcase:write"],
        created_at: data.created_at || new Date().toISOString(),
        revoked_at: null,
      };
      setKeys((prev) => [newKey, ...prev]);
      setRevealedToken(data.token);
      setIsGenerateOpen(false);
      setKeyName("");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (revokingId) return;

    try {
      setRevokingId(id);
      setActionError(null);
      const res = await fetch(`/api/api-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to revoke API key.");
      }
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke API key.");
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (text: string, isToken: boolean = false) => {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(text);
      if (isToken) {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
      }
    } catch {
      setCopyError("Copy failed. Select the text manually to copy.");
    }
  };

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        pholio: {
          url: `${APP_URL}/api/mcp`,
          headers: {
            Authorization: `Bearer ${revealedToken || "pholio_live_your_key_here"}`,
          },
        },
      },
    },
    null,
    2
  );

  const claudeSnippet = JSON.stringify(
    {
      mcpServers: {
        pholio: {
          command: "npx",
          args: ["-y", "mcp-proxy", `${APP_URL}/api/mcp`],
          env: {
            PHOLIO_API_KEY: revealedToken || "pholio_live_your_key_here",
          },
        },
      },
    },
    null,
    2
  );

  const antigravitySnippet = JSON.stringify(
    {
      mcpServers: {
        pholio: {
          url: `${APP_URL}/api/mcp`,
          headers: {
            Authorization: `Bearer ${revealedToken || "pholio_live_your_key_here"}`,
          },
        },
      },
    },
    null,
    2
  );

  const activeSnippet =
    instructionTab === "cursor"
      ? cursorSnippet
      : instructionTab === "claude"
      ? claudeSnippet
      : antigravitySnippet;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <Key className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            Agent API Keys
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Generate API keys to empower AI coding agents (Claude, Cursor, Copilot, Antigravity) to update your showcase automatically via MCP.
          </p>
        </div>
        <div>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            className="w-full sm:w-auto gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-50 dark:bg-neutral-50 dark:hover:bg-neutral-200 dark:text-neutral-950"
          >
            <Plus className="h-4 w-4" />
            Generate API Key
          </Button>
        </div>
      </div>

      {(loadError || actionError || copyError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {loadError || actionError || copyError}
        </div>
      )}

      {/* Generated Token Dialog */}
      <Dialog open={!!revealedToken} onOpenChange={(open) => !open && setRevealedToken(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-2">
              <Shield className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">API Key Generated</DialogTitle>
            <DialogDescription className="text-center">
              Your new agent API key is ready. Add this key to your AI agent configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Warning Callout */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold">Copy once — it won&apos;t be shown again.</span>
                <p className="mt-0.5 text-amber-800/90 dark:text-amber-400/90">
                  Store this key safely. For security reasons, we only store a cryptographic hash and cannot show the secret again.
                </p>
              </div>
            </div>

            {/* Token display box */}
            <div className="relative rounded-lg border border-neutral-200 bg-neutral-900 p-3.5 font-mono text-xs text-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 flex items-center justify-between gap-3">
              <span className="truncate select-all text-emerald-400 font-medium">
                {revealedToken}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => revealedToken && copyToClipboard(revealedToken, true)}
                className="shrink-0 h-8 gap-1.5 border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs"
              >
                {copiedToken ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {copyError && (
              <div role="alert" className="text-xs text-red-600 dark:text-red-400">
                {copyError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => setRevealedToken(null)}
            >
              Done, I have saved my key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate API Key Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Agent API Key</DialogTitle>
            <DialogDescription>
              Give this key a descriptive label so you remember which IDE or agent uses it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerate} className="space-y-4">
            {generateError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                {generateError}
              </div>
            )}
            <div className="space-y-2">
              <label
                htmlFor="key-name"
                className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Key Name
              </label>
              <Input
                id="key-name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Cursor IDE agent"
                autoFocus
                required
              />
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Default scopes: <code className="font-mono text-neutral-700 dark:text-neutral-300">showcase:write, stats:read, leaderboard:read</code> (update projects, publish showcases, sync READMEs, read stats and leaderboards)
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGenerateOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Keys Table Card */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
            Active & Previous Keys
          </CardTitle>
          <CardDescription>
            Keys allow authorized AI agents to access your showcase tools via MCP.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                <Key className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                No API keys generated yet
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Generate an agent API key above to connect Cursor, Claude Desktop, or Antigravity to your Pholio showcase.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table aria-label="Agent API keys" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Prefix</th>
                    <th className="py-3 px-4 font-medium">Scopes</th>
                    <th className="py-3 px-4 font-medium">Created Date</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {keys.map((k) => {
                    const isRevoked = !!k.revoked_at;
                    const formattedDate = new Date(k.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr
                        key={k.id}
                        className={`transition-colors ${
                          isRevoked
                            ? "bg-neutral-50/40 text-neutral-400 dark:bg-neutral-900/20 dark:text-neutral-500"
                            : "hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-neutral-400" />
                            <span>{k.name || "Agent Key"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                          <code>{k.prefix}...</code>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes?.map((scope) => (
                              <Badge
                                key={scope}
                                variant="outline"
                                className="text-[10px] font-mono border-neutral-300 dark:border-neutral-700"
                              >
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                              Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isRevoked ? (
                            <span className="text-neutral-400 text-[11px]">Revoked</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={revokingId === k.id}
                              onClick={() => handleRevoke(k.id)}
                              className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              {revokingId === k.id ? "Revoking..." : "Revoke"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Instructions Box */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                Quick Configuration Instructions
              </CardTitle>
              <CardDescription>
                Configure your AI coding environment to use Pholio&apos;s Model Context Protocol (MCP) server.
              </CardDescription>
            </div>
            <Link
              href="/agents.md"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              Full Agent Documentation
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Configuration Tabs */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInstructionTab("cursor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                instructionTab === "cursor"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Cursor (.cursor/mcp.json)
            </button>
            <button
              type="button"
              onClick={() => setInstructionTab("claude")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                instructionTab === "claude"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Claude Desktop (claude_desktop_config.json)
            </button>
            <button
              type="button"
              onClick={() => setInstructionTab("antigravity")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                instructionTab === "antigravity"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Antigravity / Cline
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {instructionTab === "cursor" && (
              <p>
                Place this snippet in <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">.cursor/mcp.json</code> in your project repository or Cursor Settings &rarr; MCP:
              </p>
            )}
            {instructionTab === "claude" && (
              <p>
                Add this to <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">claude_desktop_config.json</code> under the <code className="font-mono">mcpServers</code> key:
              </p>
            )}
            {instructionTab === "antigravity" && (
              <p>
                Add this configuration to your Antigravity or Cline MCP settings file:
              </p>
            )}
          </div>

          <div className="relative rounded-lg border border-neutral-200 bg-neutral-950 p-4 font-mono text-xs text-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(activeSnippet)}
              className="absolute top-3 right-3 h-7 px-2.5 gap-1.5 border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white dark:border-neutral-700 dark:bg-neutral-900 text-[11px]"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Config
                </>
              )}
            </Button>
            <pre className="overflow-x-auto text-[11px] leading-relaxed pt-4 text-neutral-200">
              {activeSnippet}
            </pre>
          </div>

          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 p-3.5 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5">
            <Laptop className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Agent Capability:
              </span>{" "}
              With this configuration, your agent can call <code className="font-mono text-neutral-800 dark:text-neutral-200">publish_showcase</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">update_project</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">sync_readme</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">upload_mockup</code>, and query <code className="font-mono text-neutral-800 dark:text-neutral-200">get_stats</code>.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
