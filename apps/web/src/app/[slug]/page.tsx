import { notFound, permanentRedirect } from "next/navigation";
import { getBySlug } from "@/features/profile/server/service";
import { APP_URL, showcaseUrl } from "@/lib/env";
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

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-neutral-100/70 dark:bg-neutral-900/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-neutral-200/60 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            {profile.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.slug}
                className="h-14 w-14 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
              />
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                {profile.display_name || profile.slug}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile.headline || "Product engineer"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono">
              Template: {profile.template}
            </span>
            {profile.site_url && (
              <a
                href={profile.site_url}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Website
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-neutral-500 py-16 border border-dashed border-neutral-200 rounded-2xl dark:border-neutral-800">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            Showcase template shell loaded ({profile.template})
          </p>
          <p className="text-xs mt-1 text-neutral-400">
            Full Story & Index templates implement in Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
}
