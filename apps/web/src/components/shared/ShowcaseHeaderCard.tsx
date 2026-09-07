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

export function ShowcaseHeaderCard({
  displayName,
  headline = "Product engineer",
  avatarUrl,
  joinedDate = "01/15/26",
  siteUrl,
}: ShowcaseHeaderCardProps) {
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {headline}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-neutral-200/80 dark:border-neutral-800">
        <div className="text-right">
          <div className="text-xs text-neutral-400 font-medium">Member</div>
          <div className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
            Joined {joinedDate}
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={siteUrl ? `mailto:contact@${new URL(siteUrl).hostname}` : "mailto:contact@pholio.dev"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 bg-white/80 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <MessageSquare className="h-3.5 w-3.5 opacity-70" />
              Chat
            </a>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
