import * as React from "react";
import Link from "next/link";
import { projectDeepUrl } from "@/lib/env";
import { StatPulse } from "./StatPulse";

export interface IndexProjectRowProps {
  userSlug: string;
  projectSlug: string;
  name: string;
  subtitle?: string | null;
  blurb?: string | null;
  thumbnails?: string[];
  visitors7d?: number;
  actives7d?: number;
}

export function IndexProjectRow({
  userSlug,
  projectSlug,
  name,
  subtitle,
  blurb,
  thumbnails = [],
  visitors7d,
  actives7d,
}: IndexProjectRowProps) {
  const href = `/${userSlug}/${projectSlug}`;

  return (
    <div className="py-5 border-b border-neutral-100 dark:border-neutral-900 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="font-semibold text-sm text-neutral-950 hover:underline underline-offset-4 dark:text-neutral-50"
          >
            {name}
          </Link>
          {subtitle && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </span>
          )}
        </div>
        <StatPulse
          projectSlug={projectSlug}
          visitors7d={visitors7d}
          actives7d={actives7d}
        />
      </div>

      {blurb && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-lg">
          {blurb}
        </p>
      )}

      {thumbnails.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          {thumbnails.slice(0, 3).map((thumb, i) => (
            <Link
              key={i}
              href={href}
              className="h-16 w-24 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={`${name} thumbnail`}
                className="h-full w-full object-cover"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
