import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";

export interface ShowcaseHeaderCardProps {
  displayName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  joinedDate?: string | null;
  siteUrl?: string | null;
}

function getSafeHostname(siteUrl?: string | null): string | null {
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname || null;
  } catch {
    return null;
  }
}

export function ShowcaseHeaderCard({
  displayName,
  headline,
  avatarUrl,
  joinedDate,
  siteUrl,
}: ShowcaseHeaderCardProps) {
  const safeHostname = getSafeHostname(siteUrl);
  const displayJoined = joinedDate || "—";
  return (
    <div className="bg-neutral-100/70 dark:bg-neutral-900/60 rounded-[24px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-neutral-200/60 dark:border-neutral-800">
      <div className="flex items-center gap-4">
        <Avatar
          src={avatarUrl}
          alt={displayName}
          className="h-14 w-14 border-2 border-white shadow-2xs dark:border-neutral-800"
        />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            {displayName}
          </h1>
          {headline && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {headline}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-neutral-200/80 dark:border-neutral-800">
        <div className="text-right">
          <div className="text-xs text-neutral-400 font-medium">Member</div>
          <div className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
            Joined {displayJoined}
          </div>
          {safeHostname && (
            <div className="text-[11px] font-mono text-neutral-400 truncate max-w-[160px]">
              {safeHostname}
            </div>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-label="Chat coming soon"
                title="Coming soon"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 bg-white/80 text-xs font-medium text-neutral-400 cursor-not-allowed opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500"
              >
                <MessageSquare className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                Chat
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
