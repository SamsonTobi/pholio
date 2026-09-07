"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function IndexTabs({
  activeTab,
  onTabChange,
  isOwner = false,
}: {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = activeTab || searchParams.get("tab") || "posts";

  const handleTabChange = (tab: string) => {
    onTabChange?.(tab);
    // Lift tab state to ?tab= search param
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "posts") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // clipboard unavailable
    }
  };

  const handleSecondaryAction = () => {
    window.location.href = isOwner ? "/dashboard/settings" : "/login";
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-6">
      <div className="flex items-center gap-6" role="tablist" aria-label="Showcase sections">
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "posts"}
          onClick={() => handleTabChange("posts")}
          className={`text-sm font-medium pb-2 -mb-2.5 transition-colors border-b-2 cursor-pointer ${
            currentTab === "posts"
              ? "border-neutral-950 text-neutral-950 dark:border-neutral-50 dark:text-neutral-50"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          Posts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "information"}
          onClick={() => handleTabChange("information")}
          className={`text-sm font-medium pb-2 -mb-2.5 transition-colors border-b-2 cursor-pointer ${
            currentTab === "information"
              ? "border-neutral-950 text-neutral-950 dark:border-neutral-50 dark:text-neutral-50"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          Information
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 px-2.5"
            onClick={() => router.push("/dashboard/showcases")}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Compose
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Showcase options"
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleCopyLink}>
              Copy showcase link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSecondaryAction}>
              {isOwner ? "Dashboard settings" : "Join Pholio"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
