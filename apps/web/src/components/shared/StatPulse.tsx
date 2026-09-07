"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface StatPulseProps {
  visitors7d?: number;
  actives7d?: number;
  projectSlug?: string;
  className?: string;
}

interface StatsApiResponse {
  totals?: {
    visitors_7d: number;
    actives_7d: number;
  };
}

export function StatPulse({
  visitors7d,
  actives7d,
  projectSlug,
  className = "",
}: StatPulseProps) {
  const needsFetch = visitors7d === undefined && Boolean(projectSlug);

  const { data } = useQuery<StatsApiResponse>({
    queryKey: ["telemetry-stats-pulse", projectSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/stats?project_slug=${encodeURIComponent(projectSlug!)}&days=7`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: needsFetch,
    staleTime: 60_000,
  });

  const displayVisitors =
    visitors7d !== undefined ? visitors7d : (data?.totals?.visitors_7d ?? 0);
  const displayActives =
    actives7d !== undefined ? actives7d : (data?.totals?.actives_7d ?? 0);

  const isActive = displayActives > 0;

  return (
    <Tooltip>
      <TooltipTrigger className="inline-block">
        <span
          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors cursor-default select-none ${
            isActive
              ? "border-emerald-500/20 bg-emerald-500/5 text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/30"
              : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
          } ${className}`}
        >
          {isActive ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
          )}
          <span>
            {`${displayVisitors} ${displayVisitors === 1 ? "visitor" : "visitors"} · ${displayActives} active (7d)`}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Privacy-first telemetry measured over the last 7 days
      </TooltipContent>
    </Tooltip>
  );
}
