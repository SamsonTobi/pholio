"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnboardingStore } from "@/stores/onboarding";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { GitHubRepoItem } from "@/lib/github";
import { Star, GitFork, Lock, Globe, Check, RefreshCw } from "lucide-react";

export default function PickReposPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const {
    selectedRepos,
    toggleRepo,
    setSelectedRepos,
    includePrivate,
    setIncludePrivate,
  } = useOnboardingStore();

  useEffect(() => {
    async function loadRepos() {
      setLoading(true);
      try {
        const res = await fetch("/api/github/repos");
        if (res.ok) {
          const data = await res.json();
          setRepos(data.repos || []);
          // Pre-select top 3 by default
          if (data.repos?.length > 0) {
            setSelectedRepos(data.repos.slice(0, 3).map((r: GitHubRepoItem) => r.full_name));
          }
        }
      } catch {
        // Mock default
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, [setSelectedRepos]);

  const handleConfirm = async () => {
    if (selectedRepos.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_full_names: selectedRepos }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(data.redirectUrl || "/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRepos = includePrivate
    ? repos
    : repos.filter((r) => !r.private);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Pick what to showcase
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          Pre-selected from your most active repos. Confirm and you&apos;re live.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Your Repositories</CardTitle>
            <CardDescription>
              Select the projects you want highlighted on your public showcase.
            </CardDescription>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={includePrivate}
              onChange={(e) => setIncludePrivate(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            Include private repos
          </label>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-neutral-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Scanning your repositories...
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500 space-y-3">
              <p>No importable repos yet — push code, then hit Resync.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Resync
              </Button>
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const isSelected = selectedRepos.includes(repo.full_name);
              return (
                <div
                  key={repo.id}
                  onClick={() => toggleRepo(repo.full_name)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900/60"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-950 dark:text-neutral-50 truncate">
                        {repo.name}
                      </span>
                      {repo.private ? (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                          <Lock className="h-2.5 w-2.5" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
                          <Globe className="h-2.5 w-2.5" /> Public
                        </Badge>
                      )}
                      {repo.language && (
                        <span className="text-xs text-neutral-500 font-mono">
                          {repo.language}
                        </span>
                      )}
                    </div>

                    {repo.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" /> {repo.stargazers_count}
                      </span>
                      <TimeAgo date={repo.pushed_at} prefix="Pushed" />
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-neutral-950 border-neutral-950 text-white dark:bg-neutral-50 dark:border-neutral-50 dark:text-neutral-950"
                        : "border-neutral-300 dark:border-neutral-700"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-neutral-500">
          {selectedRepos.length} {selectedRepos.length === 1 ? "repo" : "repos"} selected
        </span>

        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={selectedRepos.length === 0 || submitting}
        >
          {submitting ? "Importing projects..." : "Confirm & Launch Showcase"}
        </Button>
      </div>
    </div>
  );
}
