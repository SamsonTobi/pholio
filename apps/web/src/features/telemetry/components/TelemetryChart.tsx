"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, BarChart3, AlertCircle } from "lucide-react";

export interface DayStat {
  day: string;
  visitors: number;
  actives_7d: number;
}

export interface StatsTotals {
  visitors_7d: number;
  actives_7d: number;
}

export interface StatsResponse {
  days: DayStat[];
  totals: StatsTotals;
}

export interface TelemetryChartProps {
  projectSlug: string;
  telemetrySlug?: string;
  className?: string;
}

function formatDayLabel(dayStr: string): { weekday: string; date: string } {
  try {
    const d = new Date(`${dayStr}T00:00:00`);
    if (isNaN(d.getTime())) return { weekday: "", date: dayStr };
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { weekday, date };
  } catch {
    return { weekday: "", date: dayStr };
  }
}

export function TelemetryChart({
  projectSlug,
  telemetrySlug,
  className = "",
}: TelemetryChartProps) {
  const [hoveredDay, setHoveredDay] = useState<DayStat | null>(null);

  const effectiveSlug = projectSlug || telemetrySlug || "";

  const { data, isLoading, isError, error } = useQuery<StatsResponse>({
    queryKey: ["telemetry-stats", effectiveSlug, 7],
    queryFn: async () => {
      if (!effectiveSlug) {
        return {
          days: [],
          totals: { visitors_7d: 0, actives_7d: 0 },
        };
      }
      const res = await fetch(
        `/api/stats?project_slug=${encodeURIComponent(effectiveSlug)}&days=7`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.statusText}`);
      }
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: Boolean(effectiveSlug),
  });

  const days = data?.days || [];
  const totals = data?.totals || { visitors_7d: 0, actives_7d: 0 };
  const maxVisitors = Math.max(...days.map((d) => d.visitors), 5);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Visitors (7d)
            </span>
            <Users className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono">
            {isLoading ? "..." : totals.visitors_7d.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Unique visitor sessions in the past 7 days
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Actives (7d)
            </span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 font-mono flex items-center gap-2">
            {isLoading ? "..." : totals.actives_7d.toLocaleString()}
            {totals.actives_7d > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Rolling active sessions over 7 days
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-xl border border-neutral-200 p-4 sm:p-5 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neutral-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              7-Day Visitor Volume
            </h4>
          </div>

          {hoveredDay ? (
            <div className="text-xs text-neutral-700 dark:text-neutral-300 font-mono">
              <span className="font-semibold text-neutral-950 dark:text-neutral-100">
                {hoveredDay.visitors}
              </span>{" "}
              visitors ·{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {hoveredDay.actives_7d}
              </span>{" "}
              active on {formatDayLabel(hoveredDay.day).date}
            </div>
          ) : (
            <span className="text-[11px] text-neutral-400">
              Hover bar for daily breakdown
            </span>
          )}
        </div>

        {/* Bars Container */}
        {isLoading ? (
          <div className="h-40 flex items-end justify-between gap-3 pt-6 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-t"
                  style={{ height: `${20 + ((i * 17) % 60)}%` }}
                />
                <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="h-40 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
            <AlertCircle className="h-5 w-5 text-neutral-400" />
            <span>Unable to load telemetry metrics: {error?.message}</span>
          </div>
        ) : days.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-neutral-400 text-xs">
            <span>No telemetry recorded in the last 7 days.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Bars */}
            <div className="h-40 flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-neutral-100 dark:border-neutral-800">
              {days.map((d) => {
                const heightPercent = Math.max(
                  Math.round((d.visitors / maxVisitors) * 100),
                  d.visitors > 0 ? 8 : 2
                );
                const { weekday, date } = formatDayLabel(d.day);
                const isHovered = hoveredDay?.day === d.day;

                return (
                  <div
                    key={d.day}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Visitor count label on top of bar on hover or always */}
                    <div
                      className={`text-[10px] font-mono mb-1.5 transition-opacity ${
                        isHovered
                          ? "opacity-100 font-bold text-neutral-900 dark:text-neutral-100"
                          : "opacity-40 text-neutral-500"
                      }`}
                    >
                      {d.visitors}
                    </div>

                    {/* Bar graphic */}
                    <div className="w-full max-w-[40px] bg-neutral-100 dark:bg-neutral-800 rounded-t overflow-hidden flex items-end h-[85%]">
                      <div
                        className={`w-full transition-all duration-300 rounded-t ${
                          isHovered
                            ? "bg-neutral-950 dark:bg-white"
                            : d.visitors > 0
                            ? "bg-neutral-800 dark:bg-neutral-200"
                            : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between gap-2 sm:gap-4 pt-1">
              {days.map((d) => {
                const { weekday, date } = formatDayLabel(d.day);
                const isHovered = hoveredDay?.day === d.day;
                return (
                  <div
                    key={d.day}
                    className="flex-1 text-center"
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div
                      className={`text-[10px] uppercase font-mono tracking-tight ${
                        isHovered
                          ? "font-bold text-neutral-950 dark:text-neutral-100"
                          : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {weekday}
                    </div>
                    <div className="text-[9px] text-neutral-400 dark:text-neutral-600">
                      {date.replace(/^[A-Za-z]+ /, "")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
