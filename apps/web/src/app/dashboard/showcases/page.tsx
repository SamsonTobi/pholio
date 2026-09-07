"use client";

import { useState } from "react";
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

const USER_PROJECTS = [
  { id: "p1", name: "Pholio" },
  { id: "p2", name: "Bankroll" },
  { id: "p3", name: "Chronos" },
];

const INITIAL_SHOWCASES: ShowcaseItem[] = [
  {
    id: "s1",
    project_id: "p1",
    projectName: "Pholio",
    body: "Launched hacker groups and scheduled digest crons with growth spike notifications.",
    meta: { pinned: true },
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    source: "manual",
  },
  {
    id: "s2",
    project_id: "p1",
    projectName: "Pholio",
    body: "Shipped initial import pipeline for GitHub repositories and automatic readme summary extraction.",
    meta: { pinned: false },
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    source: "github",
  },
  {
    id: "s3",
    project_id: "p2",
    projectName: "Bankroll",
    body: "Added multi-leg wagering basket calculations with real-time risk parity adjustments.",
    meta: { pinned: false },
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    source: "agent",
  },
  {
    id: "s4",
    project_id: "p2",
    projectName: "Bankroll",
    body: "Integrated Apple Pay & Google Pay checkout flows for mobile wagering app.",
    meta: { pinned: false },
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    source: "github",
  },
];

export default function ShowcasesPage() {
  const [showcases, setShowcases] = useState<ShowcaseItem[]>(INITIAL_SHOWCASES);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("p1");
  const [body, setBody] = useState("");
  const [pinToNow, setPinToNow] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedNotice, setPublishedNotice] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const bodyLength = body.length;
  const isBodyTooShort = bodyLength > 0 && bodyLength < 10;
  const isBodyTooLong = bodyLength > 600;
  const canPublish = bodyLength >= 10 && bodyLength <= 600 && Boolean(selectedProjectId);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;

    setPublishing(true);
    const projectName =
      USER_PROJECTS.find((p) => p.id === selectedProjectId)?.name || "Project";

    setTimeout(() => {
      const newShowcase: ShowcaseItem = {
        id: `s-${Date.now()}`,
        project_id: selectedProjectId,
        projectName,
        body: body.trim(),
        meta: { pinned: pinToNow },
        published_at: new Date().toISOString(),
        source: "manual",
      };

      // If pinToNow is true, unpin all others
      setShowcases((prev) => {
        const updated = pinToNow
          ? prev.map((item) => ({
              ...item,
              meta: { ...item.meta, pinned: false },
            }))
          : [...prev];
        return [newShowcase, ...updated];
      });

      setBody("");
      setPinToNow(false);
      setPublishing(false);
      setPublishedNotice(true);
      setTimeout(() => setPublishedNotice(false), 3000);
    }, 300);
  };

  const handleTogglePin = (id: string) => {
    setShowcases((prev) => {
      const target = prev.find((s) => s.id === id);
      const isCurrentlyPinned = Boolean(target?.meta?.pinned);
      const targetPinState = !isCurrentlyPinned;

      return prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            meta: { ...item.meta, pinned: targetPinState },
          };
        }
        // If pinning this item, unpin others
        if (targetPinState) {
          return {
            ...item,
            meta: { ...item.meta, pinned: false },
          };
        }
        return item;
      });
    });
  };

  const handleDelete = (id: string) => {
    setShowcases((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStartEdit = (showcase: ShowcaseItem) => {
    setEditingId(showcase.id);
    setEditingText(showcase.body);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim().length < 10 || editingText.length > 600) return;
    setShowcases((prev) =>
      prev.map((s) => (s.id === id ? { ...s, body: editingText.trim() } : s))
    );
    setEditingId(null);
  };

  const renderSourceBadge = (source: ShowcaseSource) => {
    switch (source) {
      case "github":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] font-normal border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <GitCommit className="h-3 w-3 text-neutral-500" />
            GitHub Sync
          </Badge>
        );
      case "agent":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] font-normal border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300"
          >
            <Bot className="h-3 w-3" />
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
            <User className="h-3 w-3 text-neutral-500" />
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

      {/* Top Card: Publish New Showcase */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                Publish New Showcase
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Post what you shipped. Pinned showcases appear in your profile&apos;s Now section.
              </CardDescription>
            </div>

            {publishedNotice && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Published!
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePublish} className="space-y-4">
            {/* Project Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full sm:w-64 h-9 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {USER_PROJECTS.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Update Body
                </label>
                {/* Character Counter */}
                <span
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
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="What did you ship, improve, or release today? (10 - 600 chars)"
                className={`w-full rounded-md border px-3 py-2 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 dark:bg-neutral-950 dark:text-neutral-100 ${
                  isBodyTooLong
                    ? "border-red-500 focus-visible:ring-red-500"
                    : isBodyTooShort
                    ? "border-amber-400 focus-visible:ring-amber-400"
                    : "border-neutral-200 focus-visible:ring-neutral-950 dark:border-neutral-800"
                }`}
              />

              {/* Validation Warnings */}
              {isBodyTooShort && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Update body must be at least 10 characters (currently {bodyLength})</span>
                </div>
              )}

              {isBodyTooLong && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Update body cannot exceed 600 characters</span>
                </div>
              )}
            </div>

            {/* Pin Checkbox & Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinToNow}
                  onChange={(e) => setPinToNow(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950 dark:border-neutral-700"
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Pin className="h-3 w-3 text-neutral-500" />
                  Pin to Now section
                </span>
              </label>

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

        {showcases.length === 0 ? (
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
                            <Pin className="h-2.5 w-2.5 fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400" />
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
                        <textarea
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
                              <X className="h-3 w-3 mr-1" />
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
                              <Check className="h-3 w-3 mr-1" />
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
                          className="h-7 px-2 text-[11px] text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(item.id)}
                          className={`h-7 px-2 text-[11px] ${
                            isPinned
                              ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                              : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
                          }`}
                        >
                          {isPinned ? (
                            <>
                              <PinOff className="h-3 w-3 mr-1" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="h-3 w-3 mr-1" />
                              Pin to Now
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 px-2 text-[11px] text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
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
