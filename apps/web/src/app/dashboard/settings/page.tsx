"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_URL } from "@/lib/env";
import { ApiKeysSection } from "@/features/agent-keys/components/ApiKeysSection";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [bioPreviously, setBioPreviously] = useState("");
  const [slug, setSlug] = useState("");
  const [slugHistory, setSlugHistory] = useState<string[]>([]);
  const [template, setTemplate] = useState<"story" | "index">("story");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayNameId = useId();
  const headlineId = useId();
  const siteUrlId = useId();
  const bioId = useId();
  const slugId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error(
            res.status === 401 ? "Please log in to manage settings." : "Failed to load profile."
          );
        }
        const data = await res.json();
        const p = data.profile;
        if (!cancelled && p) {
          setDisplayName(p.display_name || "");
          setHeadline(p.headline || "");
          setSiteUrl(p.site_url || "");
          setBioPreviously(p.bio_previously || "");
          setSlug(p.slug || "");
          setSlugHistory(Array.isArray(p.slug_history) ? p.slug_history : []);
          setTemplate(p.template === "index" ? "index" : "story");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load profile.");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.toLowerCase().trim(),
          display_name: displayName.trim(),
          headline: headline.trim(),
          site_url: siteUrl.trim() || "",
          template,
          bio_previously: bioPreviously,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save settings.");
      }
      const data = await res.json();
      const p = data.profile;
      if (p) {
        setDisplayName(p.display_name || "");
        setHeadline(p.headline || "");
        setSiteUrl(p.site_url || "");
        setBioPreviously(p.bio_previously || "");
        setSlug(p.slug || "");
        setSlugHistory(Array.isArray(p.slug_history) ? p.slug_history : []);
        setTemplate(p.template === "index" ? "index" : "story");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-8" aria-busy="true" aria-label="Loading settings">
        <div className="h-10 w-48 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        <div className="h-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
        <div className="h-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {loadError}
        </div>
      </div>
    );
  }

  const previousSlugs = slugHistory.filter((s) => s !== slug);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Manage your showcase profile details, custom URL, and display template.
        </p>
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

      {saved && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Settings saved.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              This information is shown publicly on your showcase header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor={displayNameId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Display Name
              </label>
              <Input
                id={displayNameId}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={headlineId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Headline
              </label>
              <Input
                id={headlineId}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Product engineer"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={siteUrlId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Personal Website URL
              </label>
              <Input
                id={siteUrlId}
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={bioId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                &ldquo;Previously&rdquo; Bio Lines
              </label>
              <textarea
                id={bioId}
                value={bioPreviously}
                onChange={(e) => setBioPreviously(e.target.value)}
                rows={3}
                placeholder="e.g. Previously built developer tools and real-time systems."
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Free-text bio lines for Variant B (Index template) Previously section. Each line appears as a career or background note.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Showcase URL & Slug</CardTitle>
            <CardDescription>
              Changing your slug keeps your old URL active via automatic 301 permanent redirects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor={slugId} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500 font-mono" aria-hidden="true">
                  {APP_URL}/
                </span>
                <Input
                  id={slugId}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="font-mono"
                />
              </div>
            </div>

            {previousSlugs.length > 0 && (
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Slug history:
                </span>{" "}
                Traffic to{" "}
                {previousSlugs.map((old) => (
                  <span key={old}>
                    <code className="text-neutral-800 dark:text-neutral-200">{APP_URL}/{old}</code>
                    {" will 301 redirect to "}
                    <code className="text-neutral-800 dark:text-neutral-200">{APP_URL}/{slug}</code>
                    {". "}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Showcase Style</CardTitle>
            <CardDescription>
              Choose how your projects and daily showcases are rendered.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTemplate("story")}
              aria-pressed={template === "story"}
              aria-label="Select Story template"
              className={`text-left rounded-xl border p-4 transition-all ${
                template === "story"
                  ? "border-neutral-950 bg-neutral-50/50 shadow-sm dark:border-neutral-100 dark:bg-neutral-900"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
              }`}
            >
              <div className="font-semibold text-sm mb-1 text-neutral-950 dark:text-neutral-50">
                Story (Variant A)
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Full-width layout with left project rail, narrative paragraphs, and hero device mockups.
              </p>
              <div className="h-16 rounded border border-neutral-200 bg-white dark:bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-400 font-mono" aria-hidden="true">
                [Rail] [Story + Mockup]
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("index")}
              aria-pressed={template === "index"}
              aria-label="Select Index template"
              className={`text-left rounded-xl border p-4 transition-all ${
                template === "index"
                  ? "border-neutral-950 bg-neutral-50/50 shadow-sm dark:border-neutral-100 dark:bg-neutral-900"
                  : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
              }`}
            >
              <div className="font-semibold text-sm mb-1 text-neutral-950 dark:text-neutral-50">
                Index (Variant B)
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Narrow centered editorial list with Posts / Information tabs, Now, and Previously sections.
              </p>
              <div className="h-16 rounded border border-neutral-200 bg-white dark:bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-400 font-mono" aria-hidden="true">
                [Centered Index + Rows]
              </div>
            </button>
          </CardContent>
        </Card>

        <ApiKeysSection />

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
