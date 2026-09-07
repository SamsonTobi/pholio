"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RailProjectItem {
  id: string;
  name: string;
  showcase_slug: string;
  icon_url?: string | null;
}

export function ProjectRail({
  projects,
}: {
  projects: RailProjectItem[];
}) {
  const [activeSlug, setActiveSlug] = useState<string>(projects[0]?.showcase_slug || "");
  const [expanded, setExpanded] = useState(false);

  const displayProjects = expanded ? projects : projects.slice(0, 6);

  const handleScroll = (slug: string) => {
    setActiveSlug(slug);
    const element = document.getElementById(`project-${slug}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="w-16 flex flex-col items-center gap-3 shrink-0 sticky top-24 self-start">
      <div className="flex flex-col items-center gap-2.5 p-1.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/80 dark:bg-neutral-900 dark:border-neutral-800">
        {displayProjects.map((p) => {
          const isActive = activeSlug === p.showcase_slug;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleScroll(p.showcase_slug)}
              title={p.name}
              className={cn(
                "h-10 w-10 rounded-xl overflow-hidden border transition-all cursor-pointer relative",
                isActive
                  ? "ring-2 ring-neutral-950 border-white shadow-xs dark:ring-white dark:border-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400 opacity-80 hover:opacity-100 dark:border-neutral-700"
              )}
            >
              {p.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.icon_url}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </button>
          );
        })}

        {projects.length > 6 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
    </aside>
  );
}
