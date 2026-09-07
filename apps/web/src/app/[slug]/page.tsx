import { notFound, permanentRedirect } from "next/navigation";
import { getBySlug } from "@/features/profile/server/service";
import { listProjectsByOwner } from "@/features/projects/server/service";
import { getSessionUser } from "@/features/auth/server/service";
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
import { AgentSetupBanner } from "@/components/shared/AgentSetupBanner";
import { SiteNav } from "@/components/shared/SiteNav";
import { listApiKeys } from "@/features/agent-keys/server/service";
import type { Metadata } from "next";

function formatJoinedDate(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  } catch {
    return null;
  }
}

function projectYear(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return undefined;
    return String(d.getFullYear());
  } catch {
    return undefined;
  }
}

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
  const headline = result.profile.headline || null;

  const title = headline ? `${name} — ${headline} | Pholio` : `${name} | Pholio`;
  const ogTitle = headline ? `${name} — ${headline}` : name;
  return {
    title,
    description: `${name}'s living showcase on Pholio.`,
    alternates: {
      canonical: showcaseUrl(result.profile.slug),
    },
    openGraph: {
      title: ogTitle,
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
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: `Explore ${name}'s projects and updates on Pholio.`,
      images: [`${APP_URL}/${result.profile.slug}/opengraph-image`],
    },
  };
}

export default async function ShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "information" ? "information" : "posts";
  const { profile, canonicalSlug } = await getBySlug(slug);

  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(showcaseUrl(canonicalSlug));
  }

  if (!profile) {
    notFound();
  }

  const [projects, pinnedShowcase, sessionUser] = await Promise.all([
    listProjectsByOwner(profile.id),
    getLatestPinnedShowcase(profile.id).catch(() => null),
    getSessionUser().catch(() => null),
  ]);

  const isOwner = Boolean(sessionUser && sessionUser.id === profile.id);
  // Owner-only agent setup banner, retired once any key is used.
  const agentConnected = isOwner
    ? (await listApiKeys(profile.id).catch(() => [])).some(
        (k) => !k.revoked_at && k.last_used_at
      )
    : false;
  const showAgentBanner = isOwner && !agentConnected;
  const navProps = {
    isLoggedIn: Boolean(sessionUser),
    email: sessionUser?.email ?? null,
    avatarUrl: (sessionUser?.user_metadata?.avatar_url as string | undefined) ?? null,
    showcaseHref: isOwner ? `/${profile.slug}` : null,
  };
  const activeProjects = projects.filter((p) => p.status !== "archived");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const latestShowcase = pinnedShowcase || projects.flatMap((p) => p.latestShowcases || [])[0];
  const joinedDate = formatJoinedDate(profile.created_at);

  // Variant A: Story template
  if (profile.template === "story") {
    return (
      <div className="min-h-screen">
        <SiteNav {...navProps} />
      <div className="py-10 px-4 sm:px-6">
        <ShowcaseRealtimeListener slug={profile.slug} />
        <div className="max-w-5xl mx-auto space-y-10">
          {showAgentBanner && <AgentSetupBanner appUrl={APP_URL} />}
          <ShowcaseHeaderCard
            displayName={profile.display_name || profile.slug}
            headline={profile.headline}
            avatarUrl={profile.avatar_url}
            siteUrl={profile.site_url}
            joinedDate={joinedDate}
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
                  href={`/${profile.slug}/${project.showcase_slug}`}
                  tagline={project.description}
                  readme_summary={project.readme_summary}
                  live_url={project.live_url}
                  icon_url={project.icon_url}
                  stars={project.stars}
                  status={project.status}
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
                      <a
                        key={p.id}
                        href={`/${profile.slug}/${p.showcase_slug}`}
                        className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                      >
                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 hover:underline underline-offset-4">
                          {p.name}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {p.description || "No description provided."}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Variant B: Index template
  return (
    <div className="min-h-screen">
      <SiteNav {...navProps} />
      <div className="py-10 px-4 sm:px-6">
        <ShowcaseRealtimeListener slug={profile.slug} />
        <div className="max-w-xl mx-auto space-y-6">
          {showAgentBanner && <AgentSetupBanner appUrl={APP_URL} />}
          <IndexHeader
          displayName={profile.display_name || profile.slug}
          headline={profile.headline}
          avatarUrl={profile.avatar_url}
          siteUrl={profile.site_url}
          joinedDate={joinedDate}
        />

        <IndexTabs isOwner={isOwner} activeTab={activeTab} />

        <NowSection
          body={latestShowcase?.body || null}
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
              thumbnails={
                project.mockup?.storage_path ? [project.mockup.storage_path] : []
              }
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
              : []
          }
          archivedProjects={archivedProjects.map((p) => ({
            id: p.id,
            name: p.name,
            year: projectYear(p.last_push_at || p.created_at),
            href: `/${profile.slug}/${p.showcase_slug}`,
          }          ))}
        />
      </div>
      </div>
    </div>
  );
}
