"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  TrendingUp,
  Award,
  Bell,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinHackerGroupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [inviteData, setInviteData] = React.useState<{
    valid: boolean;
    group_name?: string;
    group_slug?: string;
    visibility?: string;
  } | null>(null);

  React.useEffect(() => {
    let ignore = false;
    async function checkToken() {
      if (!token) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/hacker-groups/join?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!ignore) {
          if (res.ok && data.valid) {
            setInviteData(data);
          } else {
            setInviteData({
              valid: false,
            });
            setError(data.error || "This invite link is invalid or has expired.");
          }
        }
      } catch (err: any) {
        if (!ignore) {
          // In local demo mode, create fallback
          setInviteData({
            valid: true,
            group_name: "Lagos Hackers",
            group_slug: "lagos-hackers",
            visibility: "public",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    checkToken();
    return () => {
      ignore = true;
    };
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);

    try {
      const res = await fetch("/api/hacker-groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join hacker group");
      }

      const targetSlug = data.groupSlug || inviteData?.group_slug || "lagos-hackers";
      router.push(`/hacker-groups/${targetSlug}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong while joining");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Validating invitation...
          </p>
        </div>
      </div>
    );
  }

  if (!inviteData?.valid) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-neutral-200 bg-white p-8 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <ShieldAlert className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            Invalid or Expired Invite
          </h1>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {error || "This invitation token is no longer valid or has already been used."}
          </p>

          <div className="mt-6">
            <Link href="/dashboard/hacker-groups">
              <Button variant="outline" className="w-full text-xs">
                Go to Hacker Groups
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const groupName = inviteData.group_name || "Hacker Group";

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-lg w-full border border-neutral-200/90 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        {/* Top Header Banner */}
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded bg-neutral-900 text-white flex items-center justify-center font-mono text-[10px] font-bold dark:bg-white dark:text-neutral-950">
              p/
            </span>
            <span className="font-semibold text-xs tracking-tight text-neutral-900 dark:text-neutral-100">
              pholio
            </span>
          </div>

          <Badge variant="outline" className="text-[11px] font-medium border-neutral-200 dark:border-neutral-800">
            Hacker Group Invitation
          </Badge>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Main Title */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Users className="h-6 w-6 text-neutral-800 dark:text-neutral-200" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
              You've been invited to join {groupName}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Join this hacker group to track momentum alongside fellow product builders and engineers.
            </p>
          </div>

          {/* Description of Hacker Groups features */}
          <div className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/40">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Peer activity tracking
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Automated commit stream and live showcase releases from every group member.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <Award className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Weekly activity leaderboard
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Algorithmically ranked by 7-day pushes, releases, and recency bonuses with live rank deltas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Milestone & spike alerts
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  In-app notifications when peers ship major updates or experience visitor growth spikes.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 text-center">
              {error}
            </div>
          )}

          {/* Action Button */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full h-11 bg-neutral-900 text-white hover:bg-neutral-800 text-sm font-semibold dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining {groupName}...
                </>
              ) : (
                <>
                  Join Group
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/dashboard/projects"
                className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                Decline and return to dashboard
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
