"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_URL } from "@/lib/env";
import {
  Bot,
  Copy,
  Check,
  Key,
  ExternalLink,
  Code2,
  Sparkles,
  Terminal,
  FileText,
} from "lucide-react";

export default function AgentDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(id);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        pholio: {
          url: `${APP_URL}/api/mcp`,
          headers: {
            Authorization: "Bearer pholio_live_<prefix>_<secret>",
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
            PHOLIO_API_KEY: "pholio_live_<prefix>_<secret>",
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
            Authorization: "Bearer pholio_live_<prefix>_<secret>",
          },
        },
      },
    },
    null,
    2
  );

  const masterPrompt = `### Living Showcase Integration
When you make meaningful changes or ship features in this repository:
1. Keep project metadata up to date using update_project.
2. Post a showcase update using publish_showcase with 1-3 factual, hype-free sentences.
3. If new UI screens are implemented, upload device-framed screenshots using upload_mockup.`;

  const tools = [
    {
      name: "update_project",
      args: "project_slug, summary?, tags?, live_url?, status?",
      desc: "Updates project metadata, technology tags, live URL, and active/archived status.",
      sample: 'update_project({ project_slug: "bankroll", summary: "Capital management app" })',
    },
    {
      name: "publish_showcase",
      args: "project_slug, body (10..600 chars)",
      desc: "Publishes 1–3 concise sentences to the project's living showcase feed.",
      sample: 'publish_showcase({ project_slug: "bankroll", body: "Shipped WebSocket live odds tracker." })',
    },
    {
      name: "sync_readme",
      args: "project_slug",
      desc: "Triggers automatic re-parsing and summary generation from the repository README.",
      sample: 'sync_readme({ project_slug: "pholio" })',
    },
    {
      name: "upload_mockup",
      args: "project_slug, file_base64, device ('browser' | 'phone' | 'tablet')",
      desc: "Uploads a base64 screenshot framed in an authentic device container.",
      sample: 'upload_mockup({ project_slug: "bankroll", file_base64: "...", device: "phone" })',
    },
    {
      name: "get_stats",
      args: "project_slug, days? (default: 7)",
      desc: "Retrieves privacy-first visitor counts and pulse telemetry for the project.",
      sample: 'get_stats({ project_slug: "pholio", days: 7 })',
    },
    {
      name: "get_leaderboard",
      args: "group_slug?",
      desc: "Retrieves activity scores, push frequency, and rankings for a hacker group.",
      sample: 'get_leaderboard({ group_slug: "lagos-hackers" })',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <MarketingNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <Bot className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
            Model Context Protocol (MCP)
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Pholio for AI Coding Agents
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-3xl leading-relaxed">
            Pholio provides a standard Model Context Protocol (MCP) endpoint so autonomous coding agents (Cursor, Claude Desktop, Antigravity, Cline) can keep your showcase current as you build.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/dashboard/api-keys">
              <Button size="sm" className="gap-2">
                <Key className="h-3.5 w-3.5" />
                Generate Agent API Key
              </Button>
            </Link>
            <a
              href="/agents.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-850"
            >
              <FileText className="h-3.5 w-3.5" />
              Raw agents.md
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </a>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-850"
            >
              <FileText className="h-3.5 w-3.5" />
              llms.txt
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </a>
          </div>
        </div>

        {/* Endpoint & Authentication Card */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg">Endpoint & Authentication</CardTitle>
            <CardDescription>
              All MCP requests are served over HTTP Streamable POST requests with Bearer token authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900 font-mono text-xs space-y-2">
              <div>
                <span className="text-neutral-500">Endpoint:</span>{" "}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {APP_URL}/api/mcp
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Headers:</span>{" "}
                <span className="text-neutral-900 dark:text-neutral-100">
                  Authorization: Bearer pholio_live_&lt;prefix&gt;_&lt;secret&gt;
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IDE Setup Snippets */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            Configuration Snippets
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cursor */}
            <Card className="border-neutral-200 dark:border-neutral-800 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Cursor IDE</CardTitle>
                <CardDescription className="text-xs">
                  .cursor/mcp.json in workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-3">
                <pre className="p-3 rounded bg-neutral-950 text-neutral-100 font-mono text-[11px] overflow-x-auto">
                  {cursorSnippet}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(cursorSnippet, "cursor")}
                  className="w-full text-xs gap-1.5"
                >
                  {copiedSection === "cursor" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Claude Desktop */}
            <Card className="border-neutral-200 dark:border-neutral-800 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Claude Desktop</CardTitle>
                <CardDescription className="text-xs">
                  claude_desktop_config.json
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-3">
                <pre className="p-3 rounded bg-neutral-950 text-neutral-100 font-mono text-[11px] overflow-x-auto">
                  {claudeSnippet}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(claudeSnippet, "claude")}
                  className="w-full text-xs gap-1.5"
                >
                  {copiedSection === "claude" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Antigravity / Cline */}
            <Card className="border-neutral-200 dark:border-neutral-800 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Antigravity / Cline</CardTitle>
                <CardDescription className="text-xs">
                  mcp_settings.json
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-3">
                <pre className="p-3 rounded bg-neutral-950 text-neutral-100 font-mono text-[11px] overflow-x-auto">
                  {antigravitySnippet}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(antigravitySnippet, "antigravity")}
                  className="w-full text-xs gap-1.5"
                >
                  {copiedSection === "antigravity" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tools Reference */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            Available MCP Tools
          </h2>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400">
                  <th className="py-3 px-4 font-medium">Tool Name</th>
                  <th className="py-3 px-4 font-medium">Parameters</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {tools.map((t) => (
                  <tr key={t.name} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-950 dark:text-neutral-50 whitespace-nowrap">
                      {t.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                      {t.args}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                      {t.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Prompt Card */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                  Recommended Master Prompt
                </CardTitle>
                <CardDescription>
                  Include this in your workspace AGENTS.md or agent system prompt so your agent knows when to update your showcase.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(masterPrompt, "prompt")}
                className="gap-1.5 text-xs shrink-0"
              >
                {copiedSection === "prompt" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Prompt
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-neutral-950 text-neutral-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {masterPrompt}
            </pre>
          </CardContent>
        </Card>
      </main>

      <MarketingFooter />
    </div>
  );
}
