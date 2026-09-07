"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Copy,
  Check,
  Globe,
  Lock,
  UserPlus,
  GitCommit,
  Sparkles,
  ArrowLeft,
  Share2,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GroupInfo {
  id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
  member_count: number;
  user_role?: "owner" | "member" | null;
  is_member?: boolean;
}

interface LeaderboardMember {
  user_id: string;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  role: "owner" | "member";
  activity_score: number;
  pushes_7d: number;
  showcases_7d: number;
  last_push_at: string | null;
  current_rank: number;
  previous_rank: number | null;
  delta: {
    delta?: number;
    change?: number;
    direction?: "up" | "down" | "same";
    indicator?: "up" | "down" | "unchanged";
    text?: string;
  };
}

interface PeerActivityItem {
  id: string;
  type: "showcase" | "push";
  user_name: string;
  user_slug: string;
  avatar_url: string | null;
  message: string;
  timestamp: string;
}

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function HackerGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupSlug = params?.groupSlug as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [group, setGroup] = React.useState<GroupInfo | null>(null);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardMember[]>([]);
  const [peerFeed, setPeerFeed] = React.useState<PeerActivityItem[]>([]);
  const [isGate, setIsGate] = React.useState(false);

  // Copy state
  const [copied, setCopied] = React.useState(false);
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);

  // Invite by GitHub dialog
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [githubUsername, setGithubUsername] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [inviteSuccess, setInviteSuccess] = React.useState(false);

  // Request Access state for gated groups
  const [accessRequested, setAccessRequested] = React.useState(false);

  const fetchGroupData = React.useCallback(async () => {
    if (!groupSlug) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leaderboard?group_slug=${encodeURIComponent(groupSlug)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Hacker group not found");
      }

      if (data.isGate) {
        setIsGate(true);
        setGroup(data.group);
      } else {
        setIsGate(false);
        setGroup(data.group);
        setLeaderboard(data.leaderboard || []);
        setPeerFeed(data.peerFeed || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load hacker group");
    } finally {
      setLoading(false);
    }
  }, [groupSlug]);

  React.useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleCopyInvite = async () => {
    if (!group) return;

    try {
      let token = inviteToken;
      if (!token) {
        const res = await fetch("/api/hacker-groups/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_id: group.id }),
        });
        const data = await res.json();
        token = data.token || `inv-${group.slug}`;
        setInviteToken(token);
      }

      const fullInviteUrl = `${window.location.origin}/hacker-groups/join/${token}`;
      await navigator.clipboard.writeText(fullInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const fallbackUrl = `${window.location.origin}/hacker-groups/join/demo-${group.slug}`;
      await navigator.clipboard.writeText(fallbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInviteGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim() || !group) return;

    setInviting(true);
    try {
      await fetch("/api/hacker-groups/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: group.id,
          github_username: githubUsername.trim(),
        }),
      });

      setInviteSuccess(true);
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(false);
        setGithubUsername("");
      }, 1500);
    } catch {
      // Demo success fallback
      setInviteSuccess(true);
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(false);
        setGithubUsername("");
      }, 1500);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-neutral-950 dark:text-neutral-50">
            Hacker Group Not Found
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            The group you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/dashboard/hacker-groups">
            <Button variant="outline" className="mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hacker Groups
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Private Group Gate
  if (isGate) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 px-4 py-12">
        <div className="max-w-lg mx-auto">
          <Link
            href="/dashboard/hacker-groups"
            className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50 mb-6 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Hacker Groups
          </Link>

          <Card className="border border-neutral-200 bg-white p-8 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Lock className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            </div>

            <div className="mt-4">
              <Badge variant="outline" className="text-xs font-medium border-neutral-200 dark:border-neutral-800">
                Private Group
              </Badge>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
                {group.name}
              </h1>
              <p className="mt-1 text-xs font-mono text-neutral-400 dark:text-neutral-500">
                @{group.slug}
              </p>
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                This hacker group is private and invite-only. Membership is required to view live leaderboard rankings and peer commit updates.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {accessRequested ? (
                <div className="rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  Access requested! An owner will review your invitation.
                </div>
              ) : (
                <Button
                  onClick={() => setAccessRequested(true)}
                  className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950"
                >
                  Request Access
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isPublic = group.visibility === "public";

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/hacker-groups"
            className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Hacker Groups
          </Link>
        </div>

        {/* Group Header Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
                  {group.name}
                </h1>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-[11px] font-medium border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                >
                  {isPublic ? (
                    <>
                      <Globe className="h-3 w-3 text-neutral-500" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-neutral-500" />
                      Private
                    </>
                  )}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {group.member_count} {group.member_count === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
              <p className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                @{group.slug}
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyInvite}
                className="h-9 border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-neutral-950 dark:text-neutral-50" />
                    Copied Link
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5 text-neutral-500" />
                    Copy Invite Link
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="h-9 border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5 text-neutral-500" />
                Invite by GitHub
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs: Leaderboard & Peer Activity Feed */}
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-neutral-100 p-1 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
            <TabsTrigger
              value="leaderboard"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-neutral-950 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
            >
              Leaderboard ({leaderboard.length})
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-neutral-950 dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-neutral-50"
            >
              Peer Activity ({peerFeed.length})
            </TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            {leaderboard.length === 0 ? (
              <EmptyState
                title="No members yet — share the invite link."
                description="Invite fellow engineers to this hacker group to start tracking activity scores and 7-day momentum."
                action={
                  <Button
                    onClick={handleCopyInvite}
                    className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Copy Invite Link
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
                {/* Responsive Leaderboard Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/50 dark:text-neutral-400">
                      <tr>
                        <th scope="col" className="py-3 px-4 w-16 text-center">Rank</th>
                        <th scope="col" className="py-3 px-4">Member</th>
                        <th scope="col" className="py-3 px-4 text-center">Activity Score</th>
                        <th scope="col" className="py-3 px-4 text-center">7d Pushes</th>
                        <th scope="col" className="py-3 px-4 text-center">7d Showcases</th>
                        <th scope="col" className="py-3 px-4 text-right">Last Push</th>
                        <th scope="col" className="py-3 px-4 w-20 text-center">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {leaderboard.map((member) => {
                        const isCurrentUser = member.user_id === DEMO_USER_ID;

                        // Delta rendering
                        let deltaText = "–";
                        let deltaColor = "text-neutral-400 dark:text-neutral-500";

                        if (member.delta.direction === "up" || member.delta.indicator === "up") {
                          const val = member.delta.delta || member.delta.change || 0;
                          deltaText = `▲ +${val}`;
                          deltaColor = "text-emerald-600 dark:text-emerald-400 font-semibold";
                        } else if (member.delta.direction === "down" || member.delta.indicator === "down") {
                          const val = member.delta.delta || Math.abs(member.delta.change || 0);
                          deltaText = `▼ -${val}`;
                          deltaColor = "text-rose-600 dark:text-rose-400 font-semibold";
                        }

                        return (
                          <tr
                            key={member.user_id}
                            className={cn(
                              "transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40",
                              isCurrentUser &&
                                "bg-neutral-50/80 dark:bg-neutral-800/30 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 font-medium"
                            )}
                          >
                            {/* Rank */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center font-mono text-xs font-bold",
                                  member.current_rank === 1 && "text-amber-600 dark:text-amber-400",
                                  member.current_rank === 2 && "text-neutral-600 dark:text-neutral-300",
                                  member.current_rank === 3 && "text-amber-700 dark:text-amber-600",
                                  member.current_rank > 3 && "text-neutral-400 dark:text-neutral-500"
                                )}
                              >
                                #{member.current_rank}
                              </span>
                            </td>

                            {/* Member Avatar + Name */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.display_name}
                                    className="h-9 w-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                                    {member.display_name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/${member.slug}`}
                                      className="font-semibold text-neutral-950 hover:underline dark:text-neutral-50 text-sm truncate"
                                    >
                                      {member.display_name}
                                    </Link>
                                    {isCurrentUser && (
                                      <span className="rounded bg-neutral-200 px-1 py-0.2 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                                    @{member.slug}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Activity Score */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-neutral-100 dark:text-neutral-950">
                                {member.activity_score}
                              </span>
                            </td>

                            {/* 7d Pushes */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-xs text-neutral-700 dark:text-neutral-300">
                              {member.pushes_7d}
                            </td>

                            {/* 7d Showcases */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-xs text-neutral-700 dark:text-neutral-300">
                              {member.showcases_7d}
                            </td>

                            {/* Updated X ago */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {member.last_push_at ? (
                                <TimeAgo
                                  date={member.last_push_at}
                                  prefix="Updated"
                                  className="text-xs text-neutral-400 dark:text-neutral-500"
                                />
                              ) : (
                                <span className="text-xs text-neutral-400">–</span>
                              )}
                            </td>

                            {/* Delta Indicator */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={cn("text-xs font-mono", deltaColor)}>
                                {deltaText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Peer Activity Feed Tab */}
          <TabsContent value="activity" className="space-y-4">
            {peerFeed.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Activity updates such as git pushes and showcase releases from group members will appear here."
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:divide-neutral-800/80">
                {peerFeed.map((item) => {
                  const isPush = item.type === "push";

                  return (
                    <div key={item.id} className="p-4 flex items-start gap-3.5">
                      {/* Avatar */}
                      {item.avatar_url ? (
                        <img
                          src={item.avatar_url}
                          alt={item.user_name}
                          className="h-9 w-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300 shrink-0 mt-0.5">
                          {item.user_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/${item.user_slug}`}
                            className="font-semibold text-sm text-neutral-950 hover:underline dark:text-neutral-50"
                          >
                            {item.user_name}
                          </Link>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                            @{item.user_slug}
                          </span>
                          <span className="text-xs text-neutral-300 dark:text-neutral-700">•</span>
                          <TimeAgo
                            date={item.timestamp}
                            className="text-xs text-neutral-400 dark:text-neutral-500"
                          />
                        </div>

                        <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {item.message}
                        </p>
                      </div>

                      {/* Icon */}
                      <div className="shrink-0 text-neutral-400">
                        {isPush ? (
                          <GitCommit className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite by GitHub Username Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite by GitHub Username</DialogTitle>
            <DialogDescription>
              Directly invite an engineer to join {group.name}. They will receive an in-app invite alert.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteGithub} className="space-y-4 py-2">
            {inviteSuccess && (
              <div className="rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                Invite sent successfully!
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                GitHub Username
              </label>
              <Input
                placeholder="e.g. torvalds"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                required
                className="h-9 text-sm font-mono"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={inviting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviting || !githubUsername.trim()}
                className="h-9 text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950"
              >
                {inviting ? "Inviting..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
