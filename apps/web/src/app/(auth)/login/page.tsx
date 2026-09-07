"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

function getSafeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":") || raw.includes("\\")) {
    return null;
  }
  return raw;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth-failed";

  const handleGitHubLogin = async () => {
    setLoading(true);
    setLoginError(null);
    try {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const next = getSafeNext(params.get("next"));
      const redirectTo = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
          scopes: "read:user repo",
        },
      });
      if (error) {
        throw error;
      }
    } catch {
      setLoginError("GitHub sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group" aria-label="pholio home">
        <Logo width={95} height={31} />
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Connect with GitHub to access your showcase and projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(authFailed || loginError) && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              {loginError || "Sign-in failed. Please try connecting with GitHub again."}
            </div>
          )}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGitHubLogin}
            disabled={loading}
          >
            <GithubIcon className="h-4 w-4" />
            {loading ? "Connecting..." : "Continue with GitHub"}
          </Button>
          <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Pholio requests <code className="font-mono">read:user</code> and{" "}
            <code className="font-mono">repo</code> access to import your repositories and keep showcases in sync.
          </p>

          <div className="text-center text-xs text-neutral-500">
            First time here?{" "}
            <button
              type="button"
              onClick={handleGitHubLogin}
              className="font-medium text-neutral-950 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100"
            >
              Join Pholio
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
