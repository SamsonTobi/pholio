"use client";

import Link from "next/link";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function IndexTabs({
  activeTab = "posts",
  onTabChange,
  isOwner = false,
}: {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isOwner?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-6">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onTabChange?.("posts")}
          className={`text-sm font-medium pb-2 -mb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === "posts"
              ? "border-neutral-950 text-neutral-950 dark:border-neutral-50 dark:text-neutral-50"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          Posts
        </button>
        <button
          type="button"
          onClick={() => onTabChange?.("information")}
          className={`text-sm font-medium pb-2 -mb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === "information"
              ? "border-neutral-950 text-neutral-950 dark:border-neutral-50 dark:text-neutral-50"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          Information
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isOwner && (
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5">
              <Plus className="h-3.5 w-3.5" />
              Compose
            </Button>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
              Copy showcase link
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/login" className="w-full">
                {isOwner ? "Dashboard settings" : "Join Pholio"}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
