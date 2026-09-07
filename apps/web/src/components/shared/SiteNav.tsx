import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./AccountMenu";

export function SiteNav({
  isLoggedIn,
  email,
  avatarUrl,
  showcaseHref,
}: {
  isLoggedIn: boolean;
  email?: string | null;
  avatarUrl?: string | null;
  showcaseHref?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
        >
          <span className="h-6 w-6 rounded bg-neutral-900 text-white flex items-center justify-center font-mono text-xs font-bold dark:bg-white dark:text-neutral-950">
            p/
          </span>
          <span>pholio</span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/hacker-groups"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                Join hacker group
              </Link>
              <AccountMenu email={email} avatarUrl={avatarUrl} showcaseHref={showcaseHref} />
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Join Pholio</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
