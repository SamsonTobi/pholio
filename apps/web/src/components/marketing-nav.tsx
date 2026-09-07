import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
          <span className="h-6 w-6 rounded bg-neutral-900 text-white flex items-center justify-center font-mono text-xs font-bold dark:bg-white dark:text-neutral-950">
            p/
          </span>
          <span>pholio</span>
        </Link>

        <div className="flex items-center gap-3">
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
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">pholio</span>
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
