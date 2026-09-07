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
  headline = "Designer & full-stack builder",
  avatarUrl,
  siteUrl,
  joinedDate = "01/15/26",
}: IndexHeaderProps) {
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
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {headline}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-400">
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100 flex items-center gap-1"
          >
            <span>{siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
        <span>&bull;</span>
        <span>Member since {joinedDate}</span>
      </div>
    </div>
  );
}
