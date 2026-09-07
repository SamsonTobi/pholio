"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Projects", href: "/dashboard/projects" },
    { label: "Showcases", href: "/dashboard/showcases" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Dashboard Shell Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur dark:bg-neutral-900/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
            >
              <span className="h-6 w-6 rounded bg-neutral-900 text-white flex items-center justify-center font-mono text-xs font-bold dark:bg-white dark:text-neutral-950">
                p/
              </span>
              <span className="font-semibold tracking-tight">pholio</span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === "/dashboard/projects" &&
                    pathname.startsWith("/dashboard/projects"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50"
                        : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/60 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/tobi" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-200 bg-white hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium"
              >
                View Showcase
                <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
