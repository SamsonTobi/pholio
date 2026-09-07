import { Avatar } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";

export interface IndexHeaderProps {
  displayName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  siteUrl?: string | null;
  joinedDate?: string | null;
}

export function IndexHeader({
  displayName,
  headline,
  avatarUrl,
  siteUrl,
  joinedDate,
}: IndexHeaderProps) {
  let safeSiteUrl: string | null = null;
  let siteLabel: string | null = null;
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        safeSiteUrl = siteUrl;
        siteLabel = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
      }
    } catch {
      safeSiteUrl = null;
    }
  }
  return (
    <div className="space-y-4 pt-4 pb-6">
      <div className="flex items-center gap-3.5">
        <Avatar
          src={avatarUrl}
          alt={displayName}
          className="h-12 w-12 border border-neutral-200 dark:border-neutral-800"
        />
        <div>
          <h1 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            {displayName}
          </h1>
          {headline && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {headline}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-400">
        {safeSiteUrl && siteLabel && (
          <a
            href={safeSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100 flex items-center gap-1"
          >
            <span>{siteLabel}</span>
            <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
          </a>
        )}
        {safeSiteUrl && joinedDate && <span aria-hidden="true">&bull;</span>}
        {joinedDate && <span>Member since {joinedDate}</span>}
      </div>
    </div>
  );
}
