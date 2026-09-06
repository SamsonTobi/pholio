"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_URL } from "@/lib/env";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Tobi Samson");
  const [headline, setHeadline] = useState("Product engineer");
  const [siteUrl, setSiteUrl] = useState("https://samsontobi.dev");
  const [slug, setSlug] = useState("tobi");
  const [previousSlug] = useState("samsontobi");
  const [template, setTemplate] = useState<"story" | "index">("story");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Headline
              </label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Product engineer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Personal Website URL
              </label>
              <Input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://..."
              />
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
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500 font-mono">
                  {APP_URL}/
                </span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="font-mono"
                />
              </div>
            </div>

            {previousSlug && (
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Slug history:
                </span>{" "}
                Traffic to <code className="text-neutral-800 dark:text-neutral-200">{APP_URL}/{previousSlug}</code> will 301 redirect to <code className="text-neutral-800 dark:text-neutral-200">{APP_URL}/{slug}</code>.
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
            <div
              onClick={() => setTemplate("story")}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
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
              <div className="h-16 rounded border border-neutral-200 bg-white dark:bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                [Rail] [Story + Mockup]
              </div>
            </div>

            <div
              onClick={() => setTemplate("index")}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
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
              <div className="h-16 rounded border border-neutral-200 bg-white dark:bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                [Centered Index + Rows]
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={saved}>
            {saved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
