import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { getBySlug } from "@/features/profile/server/service";
import { getProjectBySlug } from "@/features/projects/server/service";
import { getSessionUser } from "@/features/auth/server/service";
import { StoryProjectSection } from "@/components/shared/StoryProjectSection";
import { SiteNav } from "@/components/shared/SiteNav";
import { APP_URL, projectDeepUrl } from "@/lib/env";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}): Promise<Metadata> {
  const { slug, projectSlug } = await params;
  const { profile } = await getBySlug(slug);
  if (!profile) return { title: "Not Found | Pholio" };

  const project = await getProjectBySlug(profile.id, projectSlug);
  if (!project) return { title: "Project Not Found | Pholio" };

  const canonical = projectDeepUrl(profile.slug, project.showcase_slug);

  return {
    title: `${project.name} — ${profile.display_name || profile.slug} | Pholio`,
    description: project.description || `${project.name} showcase`,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${project.name} — ${profile.display_name || profile.slug}`,
      description: project.description || `${project.name} showcase`,
      url: canonical,
      images: [
        {
          url: `${APP_URL}/${profile.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: project.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} — ${profile.display_name || profile.slug}`,
      description: project.description || `${project.name} showcase`,
      images: [`${APP_URL}/${profile.slug}/opengraph-image`],
    },
  };
}

export default async function ProjectDeepPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const { profile, canonicalSlug } = await getBySlug(slug);
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/${canonicalSlug}/${projectSlug}`);
  }
  if (!profile) notFound();

  const project = await getProjectBySlug(profile.id, projectSlug);
  if (!project) notFound();

  const sessionUser = await getSessionUser().catch(() => null);
  const isOwner = Boolean(sessionUser && sessionUser.id === profile.id);

  return (
    <div className="min-h-screen">
      <SiteNav
        isLoggedIn={Boolean(sessionUser)}
        email={sessionUser?.email ?? null}
        avatarUrl={(sessionUser?.user_metadata?.avatar_url as string | undefined) ?? null}
        showcaseHref={isOwner ? `/${profile.slug}` : null}
      />
      <div className="py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href={`/${profile.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {profile.display_name || profile.slug}&apos;s showcase
        </Link>

        <StoryProjectSection
          id={project.id}
          name={project.name}
          showcase_slug={project.showcase_slug}
          tagline={project.description}
          readme_summary={project.readme_summary}
          icon_url={project.icon_url}
          live_url={project.live_url}
          stars={project.stars}
          status={project.status}
          last_push_at={project.last_push_at}
          mockupDevice={project.mockup?.device || "browser"}
          mockupUrl={project.mockup?.storage_path}
          showcaseBodies={project.latestShowcases?.map((s) => s.body) || []}
        />

        {project.latestShowcases && project.latestShowcases.length > 0 && (
          <div className="pt-10 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Changelog & Daily Showcases
            </h3>
            <div className="space-y-4">
              {project.latestShowcases.map((sc) => (
                <div key={sc.id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                    <span>{new Date(sc.published_at).toLocaleDateString()}</span>
                    <span className="capitalize">{sc.source}</span>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {sc.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          )}
      </div>
      </div>
    </div>
  );
}
