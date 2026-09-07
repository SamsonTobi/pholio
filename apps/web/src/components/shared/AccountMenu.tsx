"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Settings, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu({
  email,
  avatarUrl,
  showcaseHref,
}: {
  email?: string | null;
  avatarUrl?: string | null;
  showcaseHref?: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Session is unusable anyway; still leave
    }
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full">
        <Avatar src={avatarUrl} alt={email || "Account"} className="h-8 w-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {email && (
          <div className="px-2 py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-44">
            {email}
          </div>
        )}
        {showcaseHref && (
          <Link href={showcaseHref}>
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              My Showcase
            </DropdownMenuItem>
          </Link>
        )}
        <Link href="/dashboard/projects">
          <DropdownMenuItem>
            <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
            Dashboard
          </DropdownMenuItem>
        </Link>
        <Link href="/dashboard/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-3.5 w-3.5" />
            Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          {signingOut ? "Signing out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
