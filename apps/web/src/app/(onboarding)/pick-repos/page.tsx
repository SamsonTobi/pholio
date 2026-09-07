"use client";

import { useEffect, useState, useId, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnboardingStore } from "@/stores/onboarding";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { GitHubRepoItem } from "@/lib/github";
import { Star, Lock, Globe, Check, RefreshCw, AlertCircle } from "lucide-react";

export default function PickReposPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    selectedRepos,
    toggleRepo,
    setSelectedRepos,
    includePrivate,
    setIncludePrivate,
  } = useOnboardingStore();
  const includePrivateId = useId();

  useEffect(() => {
    let cancelled = false;
    async function loadRepos() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/github/repos");
        if (!res.ok) {
          throw new Error("Failed to load repositories. Please try again.");
        }
        const data = await res.json();
        const allRepos: GitHubRepoItem[] = (data.repos || []).filter(
          (r: GitHubRepoItem) => !r.fork && !(r as { archived?: boolean }).archived
        );
        if (!cancelled) {
          setRepos(allRepos);
          // Pre-select after filter: top 3 visible (respect current private toggle default)
          const visible = allRepos.filter((r) => includePrivate || !r.private);
          const currentSelection = useOnboardingStore.getState().selectedRepos;
          if (currentSelection.length === 0 && visible.length > 0) {
            setSelectedRepos(visible.slice(0, 3).map((r) => r.full_name));
          } else if (currentSelection.length > 0) {
            // Prune selections that are no longer importable (forks removed)
            const validNames = new Set(allRepos.map((r) => r.full_name));
            const pruned = currentSelection.filter((n) => validNames.has(n));
            if (pruned.length !== currentSelection.length) {
              setSelectedRepos(pruned);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load repositories.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRepos();
    // Only run once on mount; private toggle filters client-side
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (selectedRepos.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_full_names: selectedRepos }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Import failed. Please try again.");
      }
      const data = await res.json();
      router.push(data.redirectUrl || "/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Import failed.");
      setSubmitting(false);
    }
  };

  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      if (r.fork) return false;
      if (!includePrivate && r.private) return false;
      return true;
    });
  }, [repos, includePrivate]);

  // Visible selection count (only counts repos currently visible after filter)
  const visibleSelectedCount = useMemo(() => {
    const visible = new Set(filteredRepos.map((r) => r.full_name));
    return selectedRepos.filter((n) => visible.has(n)).length;
  }, [filteredRepos, selectedRepos]);

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

      {(loadError || submitError) && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{loadError || submitError}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Your Repositories</CardTitle>
            <CardDescription>
              Select the projects you want highlighted on your public showcase.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input
              id={includePrivateId}
              type="checkbox"
              checked={includePrivate}
              onChange={(e) => setIncludePrivate(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor={includePrivateId} className="cursor-pointer">
              Include private repos
            </label>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div
              className="py-12 text-center text-sm text-neutral-500 flex items-center justify-center gap-2"
              aria-busy="true"
              aria-label="Loading repositories"
            >
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
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
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Resync
              </Button>
            </div>
          ) : (
            <div role="group" aria-label="Repositories" className="space-y-3">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepos.includes(repo.full_name);
                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => toggleRepo(repo.full_name)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Deselect" : "Select"} ${repo.name}`}
                    className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                      isSelected
                        ? "border-neutral-950 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900/60"
                        : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                    }`}
                  >
                    <span className="space-y-1.5 flex-1 min-w-0 block">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-950 dark:text-neutral-50 truncate">
                          {repo.name}
                        </span>
                        {repo.private ? (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" /> Private
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
                            <Globe className="h-2.5 w-2.5" aria-hidden="true" /> Public
                          </Badge>
                        )}
                        {repo.language && (
                          <span className="text-xs text-neutral-500 font-mono">
                            {repo.language}
                          </span>
                        )}
                      </span>

                      {repo.description && (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 block">
                          {repo.description}
                        </span>
                      )}

                      <span className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" aria-hidden="true" /> {repo.stargazers_count}
                        </span>
                        <TimeAgo date={repo.pushed_at} prefix="Pushed" />
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? "bg-neutral-950 border-neutral-950 text-white dark:bg-neutral-50 dark:border-neutral-50 dark:text-neutral-950"
                          : "border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-neutral-500" aria-live="polite">
          {visibleSelectedCount} {visibleSelectedCount === 1 ? "repo" : "repos"} selected
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
