"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDashboardUIStore, StatusFilter } from "@/stores/dashboard-ui";
import { useRealtimeChannel } from "@/lib/realtime-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/StatusPill";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShowcaseSection } from "@/features/showcases/components/ShowcaseSection";
import {
  Search,
  Pencil,
  RefreshCw,
  ExternalLink,
  Star,
  Code2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  showcase_slug: string;
  description: string | null;
  readme_summary: string | null;
  icon_url: string | null;
  tags: string[];
  language: string | null;
  stars: number;
  live_url: string | null;
  status: "active" | "archived";
  show_on_showcase: boolean;
  last_push_at: string | null;
  telemetry_slug: string;
  owner_id: string;
}

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, statusFilter, setStatusFilter } =
    useDashboardUIStore();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [resyncedId, setResyncedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [projectsRes, profileRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/profile"),
        ]);
        if (!projectsRes.ok) {
          throw new Error(
            projectsRes.status === 401
              ? "Please log in to view your projects."
              : "Failed to load projects."
          );
        }
        const projectsData = await projectsRes.json();
        if (!cancelled) {
          setProjects(projectsData.projects || []);
        }
        if (profileRes.ok && !cancelled) {
          const profileData = await profileRes.json();
          setProfileSlug(profileData.profile?.slug || null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load projects."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadProjects = useCallback(async () => {
    try {
      const projectsRes = await fetch("/api/projects");
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch {
      // Keep the stale list; the manual resync button stays as fallback.
    }
  }, []);

  // Live updates: the GitHub webhook / resync bumps `last_push_at`, which the
  // projects fanout trigger broadcasts on the owner's showcase channel.
  useRealtimeChannel(profileSlug ? `showcase:${profileSlug}` : null, () => {
    reloadProjects();
  });

  const handleResync = async (projectId: string) => {
    setSyncingId(projectId);
    setActionError(null);
    try {
      const res = await fetch("/api/github/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Resync failed. Please try again.");
      }
      // Refresh from server for authoritative state
      const listRes = await fetch("/api/projects");
      if (listRes.ok) {
        const data = await listRes.json();
        setProjects(data.projects || []);
      }
      setResyncedId(projectId);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Resync failed.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleVisibility = async (project: ProjectItem) => {
    const next = !(project.show_on_showcase ?? true);
    setTogglingId(project.id);
    setActionError(null);
    setProjects((cur) =>
      cur.map((p) =>
        p.id === project.id ? { ...p, show_on_showcase: next } : p
      )
    );
    try {
      const res = await fetch(
        `/api/projects?id=${encodeURIComponent(project.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_on_showcase: next }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update visibility.");
      }
      router.refresh();
    } catch (err) {
      setProjects((cur) =>
        cur.map((p) =>
          p.id === project.id
            ? { ...p, show_on_showcase: project.show_on_showcase }
            : p
        )
      );
      setActionError(
        err instanceof Error ? err.message : "Visibility update failed."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(q);
        const matchesSlug = project.showcase_slug.toLowerCase().includes(q);
        const matchesDesc = (project.description || "")
          .toLowerCase()
          .includes(q);
        const matchesReadme = (project.readme_summary || "")
          .toLowerCase()
          .includes(q);
        const matchesLanguage = (project.language || "")
          .toLowerCase()
          .includes(q);
        const matchesTags = (project.tags || []).some((tag) =>
          tag.toLowerCase().includes(q)
        );

        return (
          matchesName ||
          matchesSlug ||
          matchesDesc ||
          matchesReadme ||
          matchesLanguage ||
          matchesTags
        );
      }

      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const archived = projects.filter((p) => p.status === "archived").length;
    return { all: projects.length, active, archived };
  }, [projects]);

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  const publicHref = (project: ProjectItem) =>
    profileSlug ? `/${profileSlug}/${project.showcase_slug}` : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Projects
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage your projects, showcase updates, and GitHub sync status.
          </p>
        </div>

        <Link href="/pick-repos">
          <Button size="sm">Import Repository</Button>
        </Link>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div
          role="tablist"
          aria-label="Filter projects by status"
          className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-neutral-50"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-neutral-200/60 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500"
            aria-hidden="true"
          />
          <label htmlFor="project-search" className="sr-only">
            Search projects or tags
          </label>
          <Input
            id="project-search"
            placeholder="Search projects or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </div>

      {/* Projects Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 animate-pulse"
            />
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          title="Failed to load projects"
          description={loadError}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={
            searchQuery.trim()
              ? `No projects match "${searchQuery}". Try a different keyword.`
              : projects.length === 0
                ? "Import a repository to get started."
                : "No projects match the selected status filter."
          }
          action={
            searchQuery.trim() ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            ) : projects.length === 0 ? (
              <Link href="/pick-repos">
                <Button size="sm">Import Repository</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const href = publicHref(project);
            return (
              <Card
                key={project.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Icon and Project Meta */}
                    <div className="flex items-start gap-4">
                      {/* Project Icon */}
                      {project.icon_url ? (
                        <Image
                          src={project.icon_url}
                          alt={`${project.name} icon`}
                          width={40}
                          height={40}
                          loading="lazy"
                          sizes="40px"
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 shrink-0 text-sm">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Details */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="font-semibold text-base text-neutral-950 dark:text-neutral-50 hover:underline"
                          >
                            {project.name}
                          </Link>
                          <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">
                            /{project.showcase_slug}
                          </span>

                          <StatusPill status={project.status} />

                          {(project.show_on_showcase ?? true) === false && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                              <EyeOff className="h-2.5 w-2.5" aria-hidden="true" />
                              Hidden
                            </span>
                          )}

                          {resyncedId === project.id && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Resynced
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-2xl">
                          {project.description || project.readme_summary || "No description provided."}
                        </p>

                        {/* Tech stack badges & metadata */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {project.language && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono font-normal border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300"
                            >
                              <Code2 className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                              {project.language}
                            </Badge>
                          )}

                          {(project.tags || []).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-normal hover:bg-neutral-200"
                            >
                              {tag}
                            </Badge>
                          ))}

                          <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono ml-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                            <span>{project.stars}</span>
                          </div>

                          <span className="text-neutral-300 dark:text-neutral-700 text-xs" aria-hidden="true">
                            •
                          </span>

                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            <TimeAgo
                              date={project.last_push_at}
                              prefix="Updated"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end md:self-start shrink-0">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${project.name}`}
                          className="h-8 text-xs border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1 text-neutral-500" aria-hidden="true" />
                          Edit
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResync(project.id)}
                        disabled={syncingId === project.id}
                        aria-label={`Resync ${project.name} from GitHub`}
                        className="h-8 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <RefreshCw
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 mr-1 ${
                            syncingId === project.id
                              ? "animate-spin text-neutral-950 dark:text-neutral-50"
                              : "text-neutral-500"
                          }`}
                        />
                        {syncingId === project.id ? "Syncing..." : "Resync"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleVisibility(project)}
                        disabled={togglingId === project.id}
                        aria-pressed={(project.show_on_showcase ?? true) === false}
                        aria-label={
                          (project.show_on_showcase ?? true) === false
                            ? `Show ${project.name} on showcase`
                            : `Hide ${project.name} from showcase`
                        }
                        className="h-8 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {(project.show_on_showcase ?? true) === false ? (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1 text-neutral-500" aria-hidden="true" />
                            Show
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5 mr-1 text-neutral-500" aria-hidden="true" />
                            Hide
                          </>
                        )}
                      </Button>

                      {href && (
                        <Link href={href} target="_blank">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${project.name} showcase`}
                            className="h-8 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-neutral-500" aria-hidden="true" />
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ShowcaseSection />
    </div>
  );
}
