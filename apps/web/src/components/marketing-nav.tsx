import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/shared/AccountMenu";
import { getSessionUser } from "@/features/auth/server/service";
import { Logo } from "@/components/shared/Logo";

export async function MarketingNav() {
  const sessionUser = await getSessionUser().catch(() => null);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50" aria-label="pholio home">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {sessionUser ? (
            <>
              <Link href="/dashboard/projects">
                <Button size="sm">Go to Dashboard</Button>
              </Link>
              <AccountMenu
                email={sessionUser.email ?? null}
                avatarUrl={
                  (sessionUser.user_metadata?.avatar_url as string | undefined) ?? null
                }
              />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">
                  Join Pholio
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-8 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo width={63} height={21} />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Login
          </Link>
          <Link href="/agents.md" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            For Agents
          </Link>
          <Link href="/llms.txt" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            llms.txt
          </Link>
        </div>
      </div>
    </footer>
  );
}
