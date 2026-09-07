"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Pin,
  PinOff,
  Trash2,
  GitCommit,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Check,
  X,
  Sparkles,
} from "lucide-react";

export type ShowcaseSource = "github" | "agent" | "manual";

interface ShowcaseItem {
  id: string;
  project_id: string;
  projectName: string;
  body: string;
  meta: {
    pinned?: boolean;
    [key: string]: unknown;
  };
  published_at: string;
  source: ShowcaseSource;
}

interface ProjectOption {
  id: string;
  name: string;
}

export default function ShowcasesPage() {
  const router = useRouter();
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [body, setBody] = useState("");
  const [pinToNow, setPinToNow] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedNotice, setPublishedNotice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const projectSelectId = useId();
  const bodyInputId = useId();
  const pinCheckboxId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [projectsRes, showcasesRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/showcases"),
        ]);
        if (!projectsRes.ok) throw new Error("Failed to load projects.");
        if (!showcasesRes.ok) {
          throw new Error(
            showcasesRes.status === 401
              ? "Please log in to view showcases."
              : "Failed to load showcases."
          );
        }
        const projectsData = await projectsRes.json();
        const showcasesData = await showcasesRes.json();
        if (!cancelled) {
          const projectList: ProjectOption[] = (projectsData.projects || []).map(
            (p: { id: string; name: string }) => ({ id: p.id, name: p.name })
          );
          setProjects(projectList);
          if (projectList.length > 0) {
            setSelectedProjectId((cur) => cur || projectList[0].id);
          }
          const projectNameById = new Map(
            (projectsData.projects || []).map((p: { id: string; name: string }) => [p.id, p.name])
          );
          const items: ShowcaseItem[] = (showcasesData.showcases || []).map(
            (s: {
              id: string;
              project_id: string;
              body: string;
              meta: Record<string, unknown>;
              published_at: string;
              source: ShowcaseSource;
            }) => ({
              id: s.id,
              project_id: s.project_id,
              projectName: projectNameById.get(s.project_id) || "Project",
              body: s.body,
              meta: s.meta || {},
              published_at: s.published_at,
              source: s.source,
            })
          );
          setShowcases(items);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load showcases."
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

  const bodyLength = body.length;
  const isBodyTooShort = bodyLength > 0 && bodyLength < 10;
  const isBodyTooLong = bodyLength > 600;
  const canPublish = bodyLength >= 10 && bodyLength <= 600 && Boolean(selectedProjectId);

  const refreshShowcases = async () => {
    const res = await fetch("/api/showcases");
    if (res.ok) {
      const data = await res.json();
      const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
      setShowcases(
        (data.showcases || []).map(
          (s: {
            id: string;
            project_id: string;
            body: string;
            meta: Record<string, unknown>;
            published_at: string;
            source: ShowcaseSource;
          }) => ({
            id: s.id,
            project_id: s.project_id,
            projectName: projectNameById.get(s.project_id) || "Project",
            body: s.body,
            meta: s.meta || {},
            published_at: s.published_at,
            source: s.source,
          })
        )
      );
    }
    router.refresh();
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish || publishing) return;

    setPublishing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/showcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          body: body.trim(),
          source: "manual",
          is_pinned: pinToNow,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to publish showcase.");
      }
      setBody("");
      setPinToNow(false);
      setPublishedNotice(true);
      await refreshShowcases();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handleTogglePin = async (showcase: ShowcaseItem) => {
    const isCurrentlyPinned = Boolean(showcase.meta?.pinned);
    setActionError(null);
    try {
      const res = await fetch("/api/showcases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showcase.id, is_pinned: !isCurrentlyPinned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update pin.");
      }
      await refreshShowcases();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Pin update failed.");
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const prev = showcases;
    setShowcases((cur) => cur.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/showcases?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      setShowcases(prev);
      setActionError("Failed to delete showcase. Please try again.");
    }
  };

  const handleStartEdit = (showcase: ShowcaseItem) => {
    setEditingId(showcase.id);
    setEditingText(showcase.body);
  };

  const handleSaveEdit = async (id: string) => {
    if (editingText.trim().length < 10 || editingText.length > 600) return;
    setActionError(null);
    try {
      const res = await fetch("/api/showcases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, body: editingText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save edit.");
      }
      setEditingId(null);
      await refreshShowcases();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const renderSourceBadge = (source: ShowcaseSource) => {
    switch (source) {
      case "github":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] font-normal border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <GitCommit className="h-3 w-3 text-neutral-500" aria-hidden="true" />
            GitHub Sync
          </Badge>
        );
      case "agent":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] font-normal border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300"
          >
            <Bot className="h-3 w-3" aria-hidden="true" />
            Agent
          </Badge>
        );
      case "manual":
      default:
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] font-normal border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <User className="h-3 w-3 text-neutral-500" aria-hidden="true" />
            Manual
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Showcases
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Compose updates, share engineering milestones, and curate your living showcase timeline.
        </p>
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

      {/* Top Card: Publish New Showcase */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                Publish New Showcase
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Post what you shipped. Pinned showcases appear in your profile&apos;s Now section.
              </CardDescription>
            </div>

            {publishedNotice && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Published!
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-32 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" aria-busy="true" aria-label="Loading showcase composer" />
          ) : loadError ? (
            <div role="alert" className="text-xs text-red-600 dark:text-red-400">
              {loadError}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No projects yet. Import a repository first to publish showcases.
            </p>
          ) : (
            <form onSubmit={handlePublish} className="space-y-4">
              {/* Project Selector */}
              <div className="space-y-1.5">
                <label htmlFor={projectSelectId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Project
                </label>
                <select
                  id={projectSelectId}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full sm:w-64 h-9 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Body Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={bodyInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Update Body
                  </label>
                  {/* Character Counter */}
                  <span
                    aria-live="polite"
                    className={`text-[11px] font-mono ${
                      isBodyTooLong
                        ? "text-red-500 font-bold"
                        : isBodyTooShort
                        ? "text-amber-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {bodyLength} / 600
                  </span>
                </div>

                <textarea
                  id={bodyInputId}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="What did you ship, improve, or release today? (10 - 600 chars)"
                  aria-invalid={isBodyTooLong || isBodyTooShort}
                  aria-describedby={`${bodyInputId}-hint`}
                  className={`w-full rounded-md border px-3 py-2 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 dark:bg-neutral-950 dark:text-neutral-100 ${
                    isBodyTooLong
                      ? "border-red-500 focus-visible:ring-red-500"
                      : isBodyTooShort
                      ? "border-amber-400 focus-visible:ring-amber-400"
                      : "border-neutral-200 focus-visible:ring-neutral-950 dark:border-neutral-800"
                  }`}
                />

                {/* Validation Warnings */}
                <div id={`${bodyInputId}-hint`}>
                  {isBodyTooShort && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Update body must be at least 10 characters (currently {bodyLength})</span>
                    </div>
                  )}

                  {isBodyTooLong && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Update body cannot exceed 600 characters</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pin Checkbox & Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    id={pinCheckboxId}
                    type="checkbox"
                    checked={pinToNow}
                    onChange={(e) => setPinToNow(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950 dark:border-neutral-700"
                  />
                  <label htmlFor={pinCheckboxId} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer select-none">
                    <Pin className="h-3 w-3 text-neutral-500" aria-hidden="true" />
                    Pin to Now section
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={!canPublish || publishing}
                  size="sm"
                  className="text-xs"
                >
                  {publishing ? "Publishing..." : "Publish Showcase"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Bottom Section: Recent Showcases Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Recent Showcases
          </h2>
          <span className="text-xs text-neutral-500">
            {showcases.length} update{showcases.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading showcases">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
            ))}
          </div>
        ) : showcases.length === 0 ? (
          <EmptyState
            title="No showcases published"
            description="Use the composer above or import a GitHub repository to begin populating your timeline."
          />
        ) : (
          <div className="relative border-l border-neutral-200 dark:border-neutral-800 ml-4 pl-6 space-y-6">
            {showcases.map((item) => {
              const isPinned = Boolean(item.meta?.pinned);
              const isEditing = editingId === item.id;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    aria-hidden="true"
                    className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-white dark:bg-neutral-950 ${
                      isPinned
                        ? "border-amber-500 bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-950"
                        : "border-neutral-400 dark:border-neutral-600"
                    }`}
                  />

                  {/* Card Content */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors space-y-2.5">
                    {/* Header: Project, Source, Pinned Badge, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs text-neutral-950 dark:text-neutral-50">
                          {item.projectName}
                        </span>

                        {renderSourceBadge(item.source)}

                        {isPinned && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 text-[10px] font-medium">
                            <Pin className="h-2.5 w-2.5 fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400" aria-hidden="true" />
                            Pinned to Now
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        <TimeAgo date={item.published_at} />
                      </div>
                    </div>

                    {/* Body text / Inline editing */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <label htmlFor={`edit-${item.id}`} className="sr-only">
                          Edit showcase update
                        </label>
                        <textarea
                          id={`edit-${item.id}`}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                        />
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono ${
                              editingText.length < 10 || editingText.length > 600
                                ? "text-red-500 font-bold"
                                : "text-neutral-400"
                            }`}
                          >
                            {editingText.length} / 600
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" aria-hidden="true" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={
                                editingText.trim().length < 10 ||
                                editingText.length > 600
                              }
                              className="h-7 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    {/* Action Buttons */}
                    {!isEditing && (
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(item)}
                          aria-label={`Edit showcase ${item.id}`}
                          className="h-7 px-2 text-[11px] text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          <Pencil className="h-3 w-3 mr-1" aria-hidden="true" />
                          Edit
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(item)}
                          aria-pressed={isPinned}
                          aria-label={isPinned ? "Unpin from Now" : "Pin to Now"}
                          className={`h-7 px-2 text-[11px] ${
                            isPinned
                              ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                              : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                          }`}
                        >
                          {isPinned ? (
                            <>
                              <PinOff className="h-3 w-3 mr-1" aria-hidden="true" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="h-3 w-3 mr-1" aria-hidden="true" />
                              Pin to Now
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          aria-label="Delete showcase"
                          className="h-7 px-2 text-[11px] text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
