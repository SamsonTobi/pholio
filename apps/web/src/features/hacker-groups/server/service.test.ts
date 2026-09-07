import { describe, it, expect } from "vitest";
import {
  createGroup,
  updateGroup,
  getGroupBySlug,
  createInvite,
  joinGroupByToken,
  addMemberByGithubUsername,
  listGroupMembers,
  listGroupsForUser,
  leaveOrRemoveMember,
  listUserGroups,
  createHackerGroup,
  getGroupLeaderboard,
  createGroupInvite,
  getInviteByToken,
} from "./service";

describe("Hacker groups feature service", () => {
  const testUserId = "00000000-0000-0000-0000-000000000001";
  const memberUserId = "00000000-0000-0000-0000-000000000002";
  const otherUserId = "00000000-0000-0000-0000-000000000099";

  describe("Group creation & updates", () => {
    it("creates a new hacker group with exact object params", async () => {
      const slug = `group-${Date.now()}`;
      const group = await createGroup({
        ownerId: testUserId,
        name: "Acme Hackers",
        slug,
        visibility: "private",
      });

      expect(group.name).toBe("Acme Hackers");
      expect(group.slug).toBe(slug);
      expect(group.visibility).toBe("private");
      expect(group.user_role).toBe("owner");
      expect(group.member_count).toBe(1);
    });

    it("prevents duplicate slugs during creation", async () => {
      const slug = `dupe-${Date.now()}`;
      await createGroup({
        ownerId: testUserId,
        name: "First",
        slug,
      });

      await expect(
        createGroup({
          ownerId: testUserId,
          name: "Second",
          slug,
        })
      ).rejects.toThrow("already exists");
    });

    it("updates group name, visibility, and slug tracking slug history", async () => {
      const initialSlug = `slug-initial-${Date.now()}`;
      const group = await createGroup({
        ownerId: testUserId,
        name: "Initial Name",
        slug: initialSlug,
        visibility: "private",
      });

      const updatedSlug = `slug-updated-${Date.now()}`;
      const updated = await updateGroup({
        groupId: group.id,
        ownerId: testUserId,
        name: "Updated Name",
        slug: updatedSlug,
        visibility: "public",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.slug).toBe(updatedSlug);
      expect(updated.visibility).toBe("public");
      expect(updated.slug_history).toContain(initialSlug);

      // Resolving by historic slug redirects or resolves canonical slug
      const historicalRes = await getGroupBySlug(initialSlug, testUserId);
      expect(historicalRes.canonicalSlug).toBe(updatedSlug);
    });

    it("rejects unauthorized updates from non-owner", async () => {
      const slug = `protect-${Date.now()}`;
      const group = await createGroup({
        ownerId: testUserId,
        name: "Protected",
        slug,
      });

      await expect(
        updateGroup({
          groupId: group.id,
          ownerId: otherUserId,
          name: "Hacked",
        })
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("Group invites and membership", () => {
    it("creates invite and allows joining by token", async () => {
      const group = await createGroup({
        ownerId: testUserId,
        name: "Invite Test Group",
        slug: `invite-grp-${Date.now()}`,
      });

      const invite = await createInvite({
        groupId: group.id,
        ownerId: testUserId,
        multiUse: true,
      });

      expect(invite.token).toBeDefined();
      expect(invite.invite_url).toContain(invite.token);

      const joinRes = await joinGroupByToken({
        userId: "new-builder-1",
        token: invite.token,
      });

      expect(joinRes.success).toBe(true);
      expect(joinRes.groupSlug).toBe(group.slug);
    });

    it("supports single-use invites that expire after use", async () => {
      const group = await createGroup({
        ownerId: testUserId,
        name: "Single Use Group",
        slug: `single-use-${Date.now()}`,
      });

      const invite = await createInvite({
        groupId: group.id,
        ownerId: testUserId,
        multiUse: false,
      });

      const join1 = await joinGroupByToken({
        userId: "user-alpha",
        token: invite.token,
      });
      expect(join1.success).toBe(true);

      await expect(
        joinGroupByToken({
          userId: "user-beta",
          token: invite.token,
        })
      ).rejects.toThrow("already been used");
    });

    it("adds member by GitHub username", async () => {
      const group = await createGroup({
        ownerId: testUserId,
        name: "GitHub Add Test",
        slug: `gh-add-${Date.now()}`,
      });

      const res = await addMemberByGithubUsername({
        groupId: group.id,
        ownerId: testUserId,
        githubUsername: "octocat",
      });

      expect(res.success).toBe(true);
      expect(res.githubUsername).toBe("octocat");
    });

    it("leaves or removes member from group", async () => {
      const res = await leaveOrRemoveMember({
        groupId: "g1",
        requesterId: testUserId,
        targetUserId: "00000000-0000-0000-0000-000000000004",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("Listing and Leaderboards", () => {
    it("lists groups for a user", async () => {
      const groups = await listGroupsForUser(testUserId);
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups[0].name).toBeDefined();
    });

    it("lists group members with ranked scores", async () => {
      const members = await listGroupMembers({ groupId: "g1" });
      expect(members.length).toBeGreaterThan(0);
      expect(members[0].current_rank).toBe(1);
      expect(members[0].activity_score).toBeGreaterThanOrEqual(members[1]?.activity_score ?? 0);
    });
  });
});
