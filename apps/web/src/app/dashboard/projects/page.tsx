"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useDashboardUIStore, StatusFilter } from "@/stores/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/StatusPill";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Search,
  Pencil,
  RefreshCw,
  ExternalLink,
  Star,
  Code2,
  CheckCircle2,
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
  last_push_at: string | null;
  telemetry_slug: string;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: "p1",
    name: "Pholio",
    showcase_slug: "pholio",
    description: "Self-maintaining showcase for product builders",
    readme_summary:
      "Automated living showcase for product builders. Connect GitHub once, showcase projects, and measure visitor pulse automatically with coding agent support.",
    icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=pholio",
    tags: ["Next.js", "TypeScript", "Tailwind CSS"],
    language: "TypeScript",
    stars: 142,
    live_url: "https://pholio.dev",
    status: "active",
    last_push_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    telemetry_slug: "pholio-demo",
  },
  {
    id: "p2",
    name: "Bankroll",
    showcase_slug: "bankroll",
    description: "Sports wagering and capital management mobile application",
    readme_summary:
      "Automated ML prediction engine with multi-leg wagering baskets and risk management built with React Native and Expo.",
    icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=bankroll",
    tags: ["React Native", "Expo", "FastAPI"],
    language: "TypeScript",
    stars: 88,
    live_url: "https://bankroll.ng",
    status: "active",
    last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    telemetry_slug: "bankroll-demo",
  },
  {
    id: "p3",
    name: "Chronos",
    showcase_slug: "chronos",
    description: "Distributed cron runner and event scheduler engine",
    readme_summary:
      "High-throughput fault-tolerant task scheduler built on Redis and Postgres logical replication.",
    icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=chronos",
    tags: ["Go", "PostgreSQL", "Redis"],
    language: "Go",
    stars: 53,
    live_url: null,
    status: "archived",
    last_push_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    telemetry_slug: "chronos-demo",
  },
];

export default function ProjectsDashboardPage() {
  const { searchQuery, setSearchQuery, statusFilter, setStatusFilter } =
    useDashboardUIStore();

  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [resyncedId, setResyncedId] = useState<string | null>(null);

  const handleResync = async (projectId: string) => {
    setSyncingId(projectId);
    try {
      const res = await fetch("/api/github/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, last_push_at: new Date().toISOString() }
              : p
          )
        );
        setResyncedId(projectId);
        setTimeout(() => setResyncedId(null), 3000);
      }
    } catch {
      // Offline / demo fallback
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, last_push_at: new Date().toISOString() }
            : p
        )
      );
      setResyncedId(projectId);
      setTimeout(() => setResyncedId(null), 3000);
    } finally {
      setSyncingId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      // Search query filter
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
        const matchesTags = project.tags.some((tag) =>
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Projects
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage your project showcases, mockups, and GitHub sync status.
          </p>
        </div>

        <Link href="/onboarding">
          <Button size="sm">Import Repository</Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-neutral-50"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            placeholder="Search projects or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </div>

      {/* Projects Grid / List */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={
            searchQuery.trim()
              ? `No projects match "${searchQuery}". Try a different keyword.`
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
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => (
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
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={project.icon_url}
                        alt={project.name}
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

                        <StatusPill
                          status={
                            project.status === "active" ? "Active" : "Archived"
                          }
                          className={
                            project.status === "archived"
                              ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              : ""
                          }
                        />

                        {resyncedId === project.id && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Resynced
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-2xl">
                        {project.description || project.readme_summary}
                      </p>

                      {/* Tech stack badges & metadata */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {project.language && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-normal border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300"
                          >
                            <Code2 className="h-2.5 w-2.5 mr-1" />
                            {project.language}
                          </Badge>
                        )}

                        {project.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-normal hover:bg-neutral-200"
                          >
                            {tag}
                          </Badge>
                        ))}

                        <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono ml-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{project.stars}</span>
                        </div>

                        <span className="text-neutral-300 dark:text-neutral-700 text-xs">
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
                        className="h-8 text-xs border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1 text-neutral-500" />
                        Edit
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResync(project.id)}
                      disabled={syncingId === project.id}
                      className="h-8 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1 ${
                          syncingId === project.id
                            ? "animate-spin text-neutral-950 dark:text-neutral-50"
                            : "text-neutral-500"
                        }`}
                      />
                      {syncingId === project.id ? "Syncing..." : "Resync"}
                    </Button>

                    <Link
                      href={`/tobi/${project.showcase_slug}`}
                      target="_blank"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1 text-neutral-500" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
