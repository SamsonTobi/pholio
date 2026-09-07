import { notFound, permanentRedirect } from "next/navigation";
import { getBySlug } from "@/features/profile/server/service";
import { listProjectsByOwner } from "@/features/projects/server/service";
import { APP_URL, showcaseUrl } from "@/lib/env";
import { ShowcaseHeaderCard } from "@/components/shared/ShowcaseHeaderCard";
import { ProjectRail } from "@/components/shared/ProjectRail";
import { StoryProjectSection } from "@/components/shared/StoryProjectSection";
import { IndexHeader } from "@/components/shared/IndexHeader";
import { IndexTabs } from "@/components/shared/IndexTabs";
import { IndexProjectRow } from "@/components/shared/IndexProjectRow";
import { NowSection } from "@/components/shared/NowSection";
import { PreviouslySection } from "@/components/shared/PreviouslySection";
import { getLatestPinnedShowcase } from "@/features/showcases/server/service";
import { ShowcaseRealtimeListener } from "@/components/shared/ShowcaseRealtimeListener";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBySlug(slug);

  if (!result.profile) {
    return {
      title: "Showcase Not Found | Pholio",
    };
  }

  const name = result.profile.display_name || result.profile.slug;
  const headline = result.profile.headline || "Product engineer";

  return {
    title: `${name} — ${headline} | Pholio`,
    description: `${name}'s living showcase on Pholio.`,
    alternates: {
      canonical: showcaseUrl(result.profile.slug),
    },
    openGraph: {
      title: `${name} — ${headline}`,
      description: `Explore ${name}'s projects and updates on Pholio.`,
      url: showcaseUrl(result.profile.slug),
      images: [
        {
          url: `${APP_URL}/${result.profile.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { profile, canonicalSlug } = await getBySlug(slug);

  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(showcaseUrl(canonicalSlug));
  }

  if (!profile) {
    notFound();
  }

  const projects = await listProjectsByOwner(profile.id);
  const activeProjects = projects.filter((p) => p.status !== "archived");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const pinnedShowcase = await getLatestPinnedShowcase(profile.id).catch(() => null);
  const latestShowcase = pinnedShowcase || projects.flatMap((p) => p.latestShowcases || [])[0];

  // Variant A: Story template
  if (profile.template === "story") {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6">
        <ShowcaseRealtimeListener slug={profile.slug} />
        <div className="max-w-5xl mx-auto space-y-10">
          <ShowcaseHeaderCard
            displayName={profile.display_name || profile.slug}
            headline={profile.headline}
            avatarUrl={profile.avatar_url}
            siteUrl={profile.site_url}
            joinedDate="01/15/26"
          />

          <div className="grid grid-cols-1 md:grid-cols-[64px_1fr] gap-8">
            <div className="hidden md:block">
              <ProjectRail
                projects={activeProjects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  showcase_slug: p.showcase_slug,
                  icon_url: p.icon_url,
                }))}
              />
            </div>

            <div className="space-y-16">
              {activeProjects.map((project) => (
                <StoryProjectSection
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  showcase_slug={project.showcase_slug}
                  tagline={project.description}
                  readme_summary={project.readme_summary}
                  live_url={project.live_url}
                  icon_url={project.icon_url}
                  stars={project.stars}
                  last_push_at={project.last_push_at}
                  mockupDevice={project.mockup?.device || "browser"}
                  mockupUrl={project.mockup?.storage_path}
                  showcaseBodies={project.latestShowcases?.map((s) => s.body) || []}
                />
              ))}

              {archivedProjects.length > 0 && (
                <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 mb-4">
                    Archived Projects
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
                    {archivedProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50"
                      >
                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {p.description || "No description provided."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variant B: Index template
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6">
      <ShowcaseRealtimeListener slug={profile.slug} />
      <div className="max-w-xl mx-auto space-y-6">
        <IndexHeader
          displayName={profile.display_name || profile.slug}
          headline={profile.headline}
          avatarUrl={profile.avatar_url}
          siteUrl={profile.site_url}
          joinedDate="01/15/26"
        />

        <IndexTabs isOwner={true} />

        <NowSection
          body={latestShowcase?.body || "Shipping the core foundation and telemetry tracker."}
          date={latestShowcase?.published_at}
        />

        <div className="space-y-1">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 pt-4">
            Projects
          </h3>
          {activeProjects.map((project) => (
            <IndexProjectRow
              key={project.id}
              userSlug={profile.slug}
              projectSlug={project.showcase_slug}
              name={project.name}
              subtitle={project.language}
              blurb={project.description}
              thumbnails={[
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=400&q=80",
              ]}
            />
          ))}
        </div>

        <PreviouslySection
          bioLines={
            profile.bio_previously
              ? profile.bio_previously
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
              : ["Previously built developer tools, WebSockets, and real-time distributed systems."]
          }
          archivedProjects={archivedProjects.map((p) => ({
            id: p.id,
            name: p.name,
            year: "2025",
          }))}
        />
      </div>
    </div>
  );
}
