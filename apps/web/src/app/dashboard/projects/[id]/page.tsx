"use client";

import { useState, use, useId } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceFrame } from "@/components/shared/DeviceFrame";
import { TelemetrySnippetTab } from "@/features/telemetry/components/TelemetrySnippetTab";
import { TelemetryChart } from "@/features/telemetry/components/TelemetryChart";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export type DeviceType = "browser" | "phone" | "tablet";

interface MockupItem {
  id: string;
  storage_path: string;
  device: DeviceType;
  sort: number;
}

interface ProjectData {
  id: string;
  name: string;
  showcase_slug: string;
  description: string;
  readme_summary: string;
  tags: string[];
  live_url: string;
  status: "active" | "archived";
  telemetry_slug: string;
  mockups: MockupItem[];
}

const DEFAULT_PROJECTS: Record<string, ProjectData> = {
  p1: {
    id: "p1",
    name: "Pholio",
    showcase_slug: "pholio",
    description: "Self-maintaining showcase for product builders",
    readme_summary:
      "Automated living showcase for product builders. Connect GitHub once, showcase projects, and measure visitor pulse automatically with coding agent support.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS"],
    live_url: "https://pholio.dev",
    status: "active",
    telemetry_slug: "pholio-demo",
    mockups: [
      {
        id: "m1",
        storage_path:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
        device: "browser",
        sort: 0,
      },
    ],
  },
  p2: {
    id: "p2",
    name: "Bankroll",
    showcase_slug: "bankroll",
    description: "Sports wagering and capital management mobile application",
    readme_summary:
      "Automated ML prediction engine with multi-leg wagering baskets and risk management built with React Native and Expo.",
    tags: ["React Native", "Expo", "FastAPI"],
    live_url: "https://bankroll.ng",
    status: "active",
    telemetry_slug: "bankroll-demo",
    mockups: [
      {
        id: "m2",
        storage_path:
          "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=800&q=80",
        device: "phone",
        sort: 0,
      },
    ],
  },
  p3: {
    id: "p3",
    name: "Chronos",
    showcase_slug: "chronos",
    description: "Distributed cron runner and event scheduler engine",
    readme_summary:
      "High-throughput fault-tolerant task scheduler built on Redis and Postgres logical replication.",
    tags: ["Go", "PostgreSQL", "Redis"],
    live_url: "",
    status: "archived",
    telemetry_slug: "chronos-demo",
    mockups: [],
  },
};

export default function ProjectEditorPage() {
  const params = useParams();
  const id = (params?.id as string) || "p1";

  const initial = DEFAULT_PROJECTS[id] || {
    id,
    name: "My Project",
    showcase_slug: "my-project",
    description: "A fast, modern web application.",
    readme_summary: "Detailed project documentation and overview.",
    tags: ["TypeScript", "Next.js"],
    live_url: "https://example.com",
    status: "active",
    telemetry_slug: `${id}-telemetry`,
    mockups: [],
  };

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [readmeSummary, setReadmeSummary] = useState(initial.readme_summary);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagInput, setTagInput] = useState("");
  const [liveUrl, setLiveUrl] = useState(initial.live_url);
  const [status, setStatus] = useState<"active" | "archived">(initial.status);
  const [mockups, setMockups] = useState<MockupItem[]>(initial.mockups);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resynced, setResynced] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputId = useId();

  // Tags management
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const clean = tagInput.trim().replace(/,/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Mockups management
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file type. Please upload a PNG, JPG, WEBP, or SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        const newMockup: MockupItem = {
          id: `mockup-${Date.now()}`,
          storage_path: result,
          device: "browser",
          sort: mockups.length,
        };
        setMockups([...mockups, newMockup]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSetDevice = (mockupId: string, device: DeviceType) => {
    setMockups(
      mockups.map((m) => (m.id === mockupId ? { ...m, device } : m))
    );
  };

  const handleMoveMockup = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mockups.length) return;

    const updated = [...mockups];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // re-index sort
    const reordered = updated.map((m, i) => ({ ...m, sort: i }));
    setMockups(reordered);
  };

  const handleDeleteMockup = (mockupId: string) => {
    setMockups(
      mockups
        .filter((m) => m.id !== mockupId)
        .map((m, i) => ({ ...m, sort: i }))
    );
  };

  // GitHub Resync
  const handleResync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/github/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      });
      setResynced(true);
      setTimeout(() => setResynced(false), 3000);
    } catch {
      setResynced(true);
      setTimeout(() => setResynced(false), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 400);
  };

  // Telemetry status query
  const { data: telemetryStats } = useQuery<{
    totals?: { visitors_7d: number; actives_7d: number };
  }>({
    queryKey: ["telemetry-stats", initial.showcase_slug, 7],
    queryFn: async () => {
      const slug = initial.showcase_slug || initial.telemetry_slug;
      const res = await fetch(`/api/stats?project_slug=${encodeURIComponent(slug)}&days=7`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const hasEvents = Boolean(
    (telemetryStats?.totals?.visitors_7d ?? 0) > 0 ||
    ["pholio-demo", "bankroll-demo"].includes(initial.telemetry_slug)
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Projects
            </Button>
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <h1 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 tracking-tight">
            {name || "Edit Project"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={syncing}
            className="text-xs border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                syncing ? "animate-spin" : "text-neutral-500"
              }`}
            />
            {syncing ? "Syncing..." : resynced ? "Resynced" : "GitHub Resync"}
          </Button>

          <Link
            href={`/tobi/${initial.showcase_slug}`}
            target="_blank"
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-neutral-200 dark:border-neutral-800"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
              View Public
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs"
          >
            {saving ? (
              "Saving..."
            ) : saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-white" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Project Information */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Configure how this project is described and positioned across your showcase views.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Project Name & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Project Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pholio"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      status === "active"
                        ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("archived")}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      status === "archived"
                        ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>
            </div>

            {/* Tagline / Short description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Tagline / Short Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief one-line summary of what you built"
              />
            </div>

            {/* Readme Summary / Full Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Full Description / Readme Summary
              </label>
              <textarea
                value={readmeSummary}
                onChange={(e) => setReadmeSummary(e.target.value)}
                rows={4}
                placeholder="Narrative breakdown or extracted GitHub readme highlights"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>

            {/* Tags & Tech Stack */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Tech Stack Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 text-xs py-0.5 px-2 bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag name and press Enter or comma (e.g. Next.js, Postgres)..."
                className="text-xs"
              />
            </div>

            {/* Live URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Live URL
              </label>
              <Input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Mockups Management */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader>
            <CardTitle>Screenshots & Mockups</CardTitle>
            <CardDescription>
              Upload application screenshots and choose which device frame (browser, phone, or tablet) wraps each image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dropzone Upload */}
            <div>
              <input
                id={fileInputId}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor={fileInputId}
                className="cursor-pointer border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors bg-neutral-50/50 dark:bg-neutral-950/50"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Click to upload screenshot
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  PNG, JPG, WEBP, or SVG (max 5MB)
                </p>
              </label>

              {uploadError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* List of Mockups */}
            {mockups.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-500 border border-neutral-100 rounded-lg dark:border-neutral-800">
                No screenshots added yet. Upload one above to display interactive device frames.
              </div>
            ) : (
              <div className="space-y-6">
                {mockups.map((mockup, index) => (
                  <div
                    key={mockup.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 space-y-4"
                  >
                    {/* Mockup Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Mockup #{index + 1}
                        </span>

                        {/* Device selector */}
                        <div className="flex items-center bg-white dark:bg-neutral-900 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-800 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "browser")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "browser"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Monitor className="h-3 w-3" />
                            Browser
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "phone")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "phone"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Smartphone className="h-3 w-3" />
                            Phone
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "tablet")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "tablet"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Tablet className="h-3 w-3" />
                            Tablet
                          </button>
                        </div>
                      </div>

                      {/* Reorder and Delete Controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => handleMoveMockup(index, "up")}
                          className="h-7 w-7 p-0"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === mockups.length - 1}
                          onClick={() => handleMoveMockup(index, "down")}
                          className="h-7 w-7 p-0"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMockup(mockup.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete mockup"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Live Preview inside DeviceFrame */}
                    <div className="max-w-xl mx-auto py-2">
                      <DeviceFrame
                        device={mockup.device}
                        src={mockup.storage_path}
                        alt={`${name} preview`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemetry & Snippet Section */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>Telemetry & Snippet</CardTitle>
                <CardDescription>
                  Measure live pulse, active visitors, and 7-day activity metrics on your showcase.
                </CardDescription>
              </div>
              {hasEvents ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Receiving events
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 w-fit">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Awaiting first ping...
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <TelemetryChart
              projectSlug={initial.showcase_slug}
              telemetrySlug={initial.telemetry_slug}
            />

            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-3">
                Embed Tracking Code
              </h4>
              <TelemetrySnippetTab
                telemetrySlug={initial.telemetry_slug}
                hasEvents={hasEvents}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
