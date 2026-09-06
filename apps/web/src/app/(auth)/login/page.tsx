"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "read:user repo",
        },
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <span className="h-7 w-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-sm dark:bg-white dark:text-neutral-950">
          p/
        </span>
        <span className="font-semibold text-lg tracking-tight text-neutral-950 dark:text-neutral-50">
          pholio
        </span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Connect with GitHub to access your showcase and projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGitHubLogin}
            disabled={loading}
          >
            <GithubIcon className="h-4 w-4" />
            {loading ? "Connecting..." : "Continue with GitHub"}
          </Button>

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
