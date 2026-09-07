"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ArrowRight,
  Globe,
  Lock,
  Crown,
  UserCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { TimeAgo } from "@/components/shared/TimeAgo";

export interface HackerGroupItem {
  id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
  member_count: number;
  user_role?: "owner" | "member" | null;
  created_at: string;
}

export default function HackerGroupsDashboardPage() {
  const [groups, setGroups] = React.useState<HackerGroupItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create Dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [isSlugCustomized, setIsSlugCustomized] = React.useState(false);
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Fetch groups on mount
  React.useEffect(() => {
    let ignore = false;
    async function fetchGroups() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/hacker-groups");
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to load hacker groups.");
        }
        const data = await res.json();
        if (!ignore) {
          if (data.groups && Array.isArray(data.groups)) {
            setGroups(data.groups);
          } else {
            setGroups([]);
          }
        }
      } catch (err) {
        if (!ignore) {
          setGroups([]);
          setLoadError(err instanceof Error ? err.message : "Failed to load hacker groups.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchGroups();
    return () => {
      ignore = true;
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugCustomized) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setCreateError("Name and slug are required");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/hacker-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          visibility,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create hacker group");
      }

      if (data.group) {
        setGroups((prev) => [data.group, ...prev]);
        setIsCreateOpen(false);
        setName("");
        setSlug("");
        setIsSlugCustomized(false);
        setVisibility("public");
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create hacker group");
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.slug.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Hacker Groups
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Track peer momentum, compete on weekly leaderboards, and celebrate releases together.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Hacker Group
        </Button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {loadError}
        </div>
      )}

      {/* Filter / Search Bar (if groups exist) */}
      {groups.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search groups by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>
        </div>
      )}

      {/* Groups Grid or Empty State */}
      {filteredGroups.length === 0 ? (
        groups.length === 0 ? (
          <EmptyState
            title="No hacker groups yet"
            description="Create your first hacker group or join an existing community to track code momentum with peers."
            action={
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Hacker Group
              </Button>
            }
          />
        ) : (
          <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No hacker groups match "{searchQuery}"
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group) => {
            const isPublic = group.visibility === "public";
            const isOwner = group.user_role === "owner";

            return (
              <Card
                key={group.id}
                className="group border border-neutral-200/80 bg-white transition-all hover:border-neutral-300 hover:shadow-xs dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div>
                    {/* Badges & Meta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-[11px] font-medium border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                        >
                          {isPublic ? (
                            <>
                              <Globe className="h-3 w-3 text-neutral-500" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 text-neutral-500" />
                              Private
                            </>
                          )}
                        </Badge>

                        {group.user_role && (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            {isOwner ? (
                              <>
                                <Crown className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                                Owner
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                                Member
                              </>
                            )}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {group.member_count} {group.member_count === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>

                    {/* Group Title & Slug */}
                    <div className="mt-3">
                      <Link
                        href={`/hacker-groups/${group.slug}`}
                        className="font-semibold text-lg text-neutral-950 hover:underline dark:text-neutral-50"
                      >
                        {group.name}
                      </Link>
                      <p className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                        @{group.slug}
                      </p>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <TimeAgo
                      date={group.created_at}
                      prefix="Created"
                      className="text-[11px] text-neutral-400 dark:text-neutral-500"
                    />

                    <Link href={`/hacker-groups/${group.slug}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800"
                      >
                        View Leaderboard
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Hacker Group Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Hacker Group</DialogTitle>
            <DialogDescription>
              Start a collective for your startup batch, developer cohort, or engineering team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
            {createError && (
              <div role="alert" className="rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="group-name" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Group Name
              </label>
              <Input
                id="group-name"
                placeholder="e.g. design-eng"
                value={name}
                onChange={handleNameChange}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="group-slug" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Group Slug
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 dark:text-neutral-500 select-none">
                  /hacker-groups/
                </span>
                <Input
                  id="group-slug"
                  placeholder="e.g. design-eng"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsSlugCustomized(true);
                  }}
                  required
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span id="visibility-label" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Visibility
              </span>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="visibility-label">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  aria-pressed={visibility === "public"}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
                    visibility === "public"
                      ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-900 dark:text-neutral-100">
                    <Globe className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
                    Public
                  </div>
                  <span className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Anyone can view the leaderboard and request to join.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  aria-pressed={visibility === "private"}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
                    visibility === "private"
                      ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-900 dark:text-neutral-100">
                    <Lock className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
                    Private
                  </div>
                  <span className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Invite-only. Leaderboard gated for non-members.
                  </span>
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createLoading}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="h-9 text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950"
              >
                {createLoading ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
