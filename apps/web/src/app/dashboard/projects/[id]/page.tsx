"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  description: string | null;
  readme_summary: string | null;
  tags: string[];
  live_url: string | null;
  status: "active" | "archived";
  telemetry_slug: string;
  owner_id: string;
}

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [readmeSummary, setReadmeSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [mockups, setMockups] = useState<MockupItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [resynced, setResynced] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputId = useId();
  const nameInputId = useId();
  const taglineInputId = useId();
  const readmeInputId = useId();
  const tagsInputId = useId();
  const liveUrlInputId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [projectRes, mockupsRes, profileRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/mockups?project_id=${encodeURIComponent(id)}`),
          fetch("/api/profile"),
        ]);
        if (!projectRes.ok) {
          throw new Error(
            projectRes.status === 404
              ? "Project not found."
              : "Failed to load project."
          );
        }
        const projectData = await projectRes.json();
        const p: ProjectData = projectData.project;
        if (!cancelled) {
          setProject(p);
          setName(p.name || "");
          setDescription(p.description || "");
          setReadmeSummary(p.readme_summary || "");
          setTags(p.tags || []);
          setLiveUrl(p.live_url || "");
          setStatus(p.status || "active");
        }
        if (mockupsRes.ok && !cancelled) {
          const mockupsData = await mockupsRes.json();
          const items = (mockupsData.mockups || [])
            .slice()
            .sort((a: MockupItem, b: MockupItem) => a.sort - b.sort)
            .slice(0, 50);
          setMockups(items);
        }
        if (profileRes.ok && !cancelled) {
          const profileData = await profileRes.json();
          setProfileSlug(profileData.profile?.slug || null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load project."
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
  }, [id]);

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

  // Mockups management — real API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file type. Please upload a PNG, JPG, or WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("project_id", id);
      formData.append("device", "browser");
      formData.append("file", file);
      const res = await fetch("/api/mockups", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload failed.");
      }
      const data = await res.json();
      if (data.mockup) {
        setMockups((prev) =>
          [...prev, data.mockup].slice(0, 50).map((m, i) => ({ ...m, sort: i }))
        );
      }
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const persistOrder = async (ordered: MockupItem[]) => {
    const prev = mockups;
    try {
      const res = await fetch("/api/mockups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: id,
          items: ordered.slice(0, 50).map((m, i) => ({ id: m.id, sort: i })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save order.");
      }
    } catch (err) {
      setMockups(prev);
      setSaveError(err instanceof Error ? err.message : "Failed to save mockup order.");
      throw err;
    }
  };

  const handleSetDevice = async (mockupId: string, device: DeviceType) => {
    const prev = mockups;
    setMockups((cur) =>
      cur.map((m) => (m.id === mockupId ? { ...m, device } : m))
    );
    try {
      const res = await fetch(`/api/mockups/device?project_id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mockupId, device }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update device frame.");
      }
    } catch (err) {
      setMockups(prev);
      setSaveError(err instanceof Error ? err.message : "Failed to update device frame.");
    }
  };

  const handleMoveMockup = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mockups.length) return;

    const updated = [...mockups];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((m, i) => ({ ...m, sort: i }));
    setMockups(reordered);
    persistOrder(reordered).catch(() => {
      // rollback + error already handled in persistOrder
    });
  };

  const handleDeleteMockup = async (mockupId: string) => {
    const prev = mockups;
    setMockups((cur) =>
      cur.filter((m) => m.id !== mockupId).map((m, i) => ({ ...m, sort: i }))
    );
    try {
      const res = await fetch(
        `/api/mockups?id=${encodeURIComponent(mockupId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      setMockups(prev);
      setUploadError("Failed to delete mockup. Please try again.");
    }
  };

  // GitHub Resync — real API, no fake success
  const handleResync = async () => {
    setSyncing(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/github/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Resync failed. Please try again.");
      }
      setResynced(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Resync failed.");
    } finally {
      setSyncing(false);
    }
  };

  // Save changes — real PATCH, no setTimeout fake
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          readme_summary: readmeSummary.trim(),
          tags,
          live_url: liveUrl.trim() || null,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Save failed. Please try again.");
      }
      const data = await res.json();
      if (data.project) setProject(data.project);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // Telemetry status query
  const showcaseSlug = project?.showcase_slug || "";
  const telemetrySlug = project?.telemetry_slug || "";
  const { data: telemetryStats } = useQuery<{
    totals?: { visitors_7d: number; actives_7d: number };
  }>({
    queryKey: ["telemetry-stats", showcaseSlug, 7],
    queryFn: async () => {
      const slug = showcaseSlug || telemetrySlug;
      if (!slug) return null;
      const res = await fetch(`/api/stats?project_slug=${encodeURIComponent(slug)}&days=7`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(showcaseSlug || telemetrySlug),
  });

  const hasEvents = Boolean((telemetryStats?.totals?.visitors_7d ?? 0) > 0);

  if (loading) {
    return (
      <div className="space-y-8 pb-16" aria-busy="true" aria-label="Loading project">
        <div className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        <div className="h-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
        <div className="h-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="space-y-6 pb-16">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Projects
          </Button>
        </Link>
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {loadError || "Project not found."}
        </div>
      </div>
    );
  }

  const publicHref =
    profileSlug && project ? `/${profileSlug}/${project.showcase_slug}` : null;

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
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Projects
            </Button>
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">/</span>
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
            aria-label={`Resync ${name} from GitHub`}
            className="text-xs border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-3.5 w-3.5 mr-1.5 ${
                syncing ? "animate-spin" : "text-neutral-500"
              }`}
            />
            {syncing ? "Syncing..." : resynced ? "Resynced" : "GitHub Resync"}
          </Button>

          {publicHref && (
            <Link href={publicHref} target="_blank">
              <Button
                variant="outline"
                size="sm"
                aria-label={`View ${name} public showcase`}
                className="text-xs border-neutral-200 dark:border-neutral-800"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-neutral-500" aria-hidden="true" />
                View Public
              </Button>
            </Link>
          )}

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
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-white" aria-hidden="true" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {saveError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

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
                <label htmlFor={nameInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Project Name
                </label>
                <Input
                  id={nameInputId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pholio"
                />
              </div>

              <div className="space-y-1.5">
                <span id="status-label" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Status
                </span>
                <div
                  role="group"
                  aria-labelledby="status-label"
                  className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                >
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    aria-pressed={status === "active"}
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
                    aria-pressed={status === "archived"}
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
              <label htmlFor={taglineInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Tagline / Short Description
              </label>
              <Input
                id={taglineInputId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief one-line summary of what you built"
              />
            </div>

            {/* Readme Summary / Full Description */}
            <div className="space-y-1.5">
              <label htmlFor={readmeInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Full Description / Readme Summary
              </label>
              <textarea
                id={readmeInputId}
                value={readmeSummary}
                onChange={(e) => setReadmeSummary(e.target.value)}
                rows={4}
                placeholder="Narrative breakdown or extracted GitHub readme highlights"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>

            {/* Tags & Tech Stack */}
            <div className="space-y-2">
              <label htmlFor={tagsInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
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
                      aria-label={`Remove tag ${tag}`}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id={tagsInputId}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag name and press Enter or comma (e.g. Next.js, Postgres)..."
                className="text-xs"
              />
            </div>

            {/* Live URL */}
            <div className="space-y-1.5">
              <label htmlFor={liveUrlInputId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Live URL
              </label>
              <Input
                id={liveUrlInputId}
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
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor={fileInputId}
                className="cursor-pointer border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors bg-neutral-50/50 dark:bg-neutral-950/50"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-2">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {uploading ? "Uploading..." : "Click to upload screenshot"}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  PNG, JPG, or WEBP (max 5MB)
                </p>
              </label>

              {uploadError && (
                <div role="alert" className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
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
                        <div
                          role="group"
                          aria-label={`Device frame for mockup ${index + 1}`}
                          className="flex items-center bg-white dark:bg-neutral-900 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-800 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "browser")}
                            aria-pressed={mockup.device === "browser"}
                            aria-label="Browser frame"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "browser"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Monitor className="h-3 w-3" aria-hidden="true" />
                            Browser
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "phone")}
                            aria-pressed={mockup.device === "phone"}
                            aria-label="Phone frame"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "phone"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Smartphone className="h-3 w-3" aria-hidden="true" />
                            Phone
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDevice(mockup.id, "tablet")}
                            aria-pressed={mockup.device === "tablet"}
                            aria-label="Tablet frame"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                              mockup.device === "tablet"
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950"
                            }`}
                          >
                            <Tablet className="h-3 w-3" aria-hidden="true" />
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
                          aria-label={`Move mockup ${index + 1} up`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === mockups.length - 1}
                          onClick={() => handleMoveMockup(index, "down")}
                          className="h-7 w-7 p-0"
                          title="Move down"
                          aria-label={`Move mockup ${index + 1} down`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMockup(mockup.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete mockup"
                          aria-label={`Delete mockup ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {/* Live Preview inside DeviceFrame */}
                    <div className="max-w-xl mx-auto py-2">
                      <DeviceFrame
                        device={mockup.device}
                        src={mockup.storage_path}
                        alt={`${name} preview ${index + 1}`}
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
              projectSlug={showcaseSlug}
              telemetrySlug={telemetrySlug}
            />

            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-3">
                Embed Tracking Code
              </h4>
              <TelemetrySnippetTab
                telemetrySlug={telemetrySlug}
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
