import { requireUser } from "@/features/auth/server/service";
import { getById } from "@/features/profile/server/service";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getById(user.id).catch(() => null);
  const showcaseHref = profile ? `/${profile.slug}` : null;

  return <DashboardShell showcaseHref={showcaseHref}>{children}</DashboardShell>;
}
