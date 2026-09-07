import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { StatusPill } from "./StatusPill";
import { DeviceFrame } from "./DeviceFrame";
import { ExternalLink, Star } from "lucide-react";
import { TimeAgo } from "./TimeAgo";
import { StatPulse } from "./StatPulse";

export interface StoryProjectProps {
  id: string;
  name: string;
  showcase_slug: string;
  tagline?: string | null;
  readme_summary?: string | null;
  description?: string | null;
  icon_url?: string | null;
  live_url?: string | null;
  stars?: number;
  status?: string | null;
  last_push_at?: string | null;
  mockupUrl?: string | null;
  mockupDevice?: "browser" | "phone" | "tablet";
  showcaseBodies?: string[];
  visitors7d?: number;
  actives7d?: number;
  href?: string | null;
}

export function StoryProjectSection({
  name,
  showcase_slug,
  tagline,
  readme_summary,
  description,
  icon_url,
  live_url,
  stars,
  status,
  last_push_at,
  mockupUrl,
  mockupDevice = "browser",
  showcaseBodies = [],
  visitors7d,
  actives7d,
  href,
}: StoryProjectProps) {
  const displayTagline = tagline || description || null;
  const titleNode = href ? (
    <Link href={href} className="hover:underline underline-offset-4">
      {name}
    </Link>
  ) : (
    <span>{name}</span>
  );

  return (
    <section id={`project-${showcase_slug}`} className="space-y-6 pt-6 first:pt-0 scroll-mt-24">
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-center gap-3">
          {icon_url ? (
            icon_url.startsWith("data:") || icon_url.startsWith("blob:") ? (
              <img
                src={icon_url}
                alt={`${name} icon`}
                loading="lazy"
                decoding="async"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
              />
            ) : (
              <Image
                src={icon_url}
                alt={`${name} icon`}
                width={28}
                height={28}
                loading="lazy"
                sizes="28px"
                className="h-7 w-7 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
              />
            )
          ) : (
            <div className="h-7 w-7 rounded-lg bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              {name.substring(0, 1)}
            </div>
          )}

          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            {titleNode}
            {displayTagline && (
              <>
                <span className="text-neutral-400 font-normal">—</span>
                <span className="text-neutral-500 font-normal text-base dark:text-neutral-400">
                  {displayTagline}
                </span>
              </>
            )}
          </h2>

          {live_url && (
            <a
              href={live_url}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title="Visit live site"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Status pill & metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <StatusPill status={status || "Shipped"} />
          <StatPulse
            projectSlug={showcase_slug}
            visitors7d={visitors7d}
            actives7d={actives7d}
          />
          {stars !== undefined && stars > 0 && (
            <span className="flex items-center gap-1 font-mono text-neutral-400">
              <Star className="h-3 w-3" /> {stars}
            </span>
          )}
          {last_push_at && (
            <TimeAgo date={last_push_at} prefix="Updated" className="text-neutral-400" />
          )}
        </div>
      </div>

      {/* Narrative paragraph */}
      <div className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-7 max-w-3xl whitespace-pre-line space-y-3">
        {readme_summary ? (
          <p>{readme_summary}</p>
        ) : (
          <p>{description || "No project description provided yet."}</p>
        )}

        {showcaseBodies.map((body, i) => (
          <p key={i} className="pl-4 border-l-2 border-neutral-200 dark:border-neutral-800 italic text-neutral-500">
            {body}
          </p>
        ))}
      </div>

      {/* Hero Mockup */}
      {mockupUrl ? (
        <DeviceFrame
          device={mockupDevice}
          src={mockupUrl}
          alt={`${name} Showcase Preview`}
        />
      ) : null}
    </section>
  );
}
