"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  text,
  idleLabel,
  className,
}: {
  text: string;
  idleLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState<string | null>(null);

  const handleCopy = async () => {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Copy failed. Select the text manually to copy.");
    }
  };

  return (
    <span className="inline-flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={className ?? "w-full text-xs gap-1.5"}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            {idleLabel}
          </>
        )}
      </Button>
      {copyError && (
        <span role="alert" className="text-[11px] text-red-600 dark:text-red-400">
          {copyError}
        </span>
      )}
    </span>
  );
}
