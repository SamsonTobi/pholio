"use client";

import React, { useState } from "react";
import { NEXT_PUBLIC_TRACKER_URL } from "@/lib/env";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TelemetrySnippetTabProps {
  telemetrySlug: string;
  hasEvents?: boolean;
}

export function TelemetrySnippetTab({
  telemetrySlug,
  hasEvents = false,
}: TelemetrySnippetTabProps) {
  const [activeTab, setActiveTab] = useState<"html" | "nextjs">("html");
  const [copied, setCopied] = useState(false);

  const trackerUrl = NEXT_PUBLIC_TRACKER_URL || "http://localhost:3000/tracker.js";

  const htmlSnippet = `<script defer data-project="${telemetrySlug}" src="${trackerUrl}"></script>`;
  const nextjsSnippet = `<Script defer data-project="${telemetrySlug}" src="${trackerUrl}" />`;

  const currentSnippet = activeTab === "html" ? htmlSnippet : nextjsSnippet;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Tab Switch and Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "html"
                ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-950 dark:text-neutral-50"
                : "hover:text-neutral-900 dark:hover:text-neutral-50"
            }`}
          >
            HTML / Static
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("nextjs")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "nextjs"
                ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-950 dark:text-neutral-50"
                : "hover:text-neutral-900 dark:hover:text-neutral-50"
            }`}
          >
            Next.js / React
          </button>
        </div>

        {hasEvents ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Receiving events
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            Awaiting first ping...
          </span>
        )}
      </div>

      {/* Snippet display block */}
      <div className="relative rounded-lg bg-neutral-950 p-3.5 font-mono text-xs text-neutral-100 dark:bg-neutral-950 border border-neutral-800 overflow-x-auto">
        <pre className="text-[12px] leading-relaxed select-all pr-28 overflow-x-auto">
          {currentSnippet}
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="absolute top-2.5 right-2.5 h-7 text-xs bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy Snippet
            </>
          )}
        </Button>
      </div>

      {/* Privacy line */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        No cookies. No fingerprinting. Counts only.
      </p>
    </div>
  );
}
