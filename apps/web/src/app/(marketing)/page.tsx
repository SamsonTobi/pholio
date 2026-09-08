import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing-nav";
import { ArrowRight } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <MarketingNav />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 mb-8 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Used by 300+ builders
        </div>

        <h1 className="text-4xl sm:text-6xl font-medium tracking-tighter text-primary dark:text-neutral-50 max-w-3xl mb-10">
          Your portfolio, connected directly to your codebase.
        </h1>

        <p className="text-sm sm:text-lg text-primary dark:text-neutral-400 max-w-xl mb-10 leading-relaxed">
          Connect GitHub once. Pholio connects your coding agent to your public showcase, so shipping and showcasing happen together.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <GithubIcon className="h-8 w-8" />
              Sign in with GitHub
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
