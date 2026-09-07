import { describe, it, expect } from "vitest";
import { publishShowcase, listShowcasesByProject } from "@/features/showcases/server/service";
import { ingestEvent, getStats } from "@/features/telemetry/server/service";
import { createGroup, createInvite, joinGroupByToken, listGroupMembers } from "@/features/hacker-groups/server/service";
import { computeLeaderboard } from "@/features/leaderboard/server/service";
import { generateApiKey, verifyApiKey } from "@/features/agent-keys/server/service";

describe("E2E Integration Flows", () => {
  const testUserId = "00000000-0000-0000-0000-000000000001";
  const testProjectId = "00000000-0000-0000-0000-000000000002";

  it("Flow 1: Showcase Publish Flow -> publish showcase appears with valid body and source", async () => {
    const showcase = await publishShowcase({
      ownerId: testUserId,
      projectId: testProjectId,
      body: "Shipped the complete telemetry tracker and hacker group leaderboards!",
      source: "manual",
      isPinned: true,
    });

    expect(showcase).toBeDefined();
    expect(showcase.body).toBe("Shipped the complete telemetry tracker and hacker group leaderboards!");
    expect(showcase.source).toBe("manual");
    expect((showcase.meta as Record<string, unknown>)?.pinned).toBe(true);

    const list = await listShowcasesByProject(testProjectId);
    expect(list.some((s) => s.id === showcase.id)).toBe(true);
  });

  it("Flow 2: Telemetry Ingest & Stats Flow -> ingest ping updates stats query", async () => {
    const telemetrySlug = "e2e-project-telemetry";
    const sessionHash = "sess-" + Math.random().toString(36).substring(2);

    const ingestResult = await ingestEvent({
      telemetrySlug,
      sessionHash,
      path: "/docs",
    });
    expect(ingestResult).toBe(true);

    const stats = await getStats({ projectSlug: telemetrySlug, days: 7 });
    expect(stats).toBeDefined();
    expect(stats.days.length).toBe(7);
    expect(stats.totals).toBeDefined();
  });

  it("Flow 3: Hacker Group & Invite Token Flow -> create group, invite token, join, compute leaderboard", async () => {
    const groupSlug = "e2e-builders-" + Date.now();
    const group = await createGroup({
      ownerId: testUserId,
      name: "E2E Builders Club",
      slug: groupSlug,
      visibility: "public",
    });
    expect(group.id).toBeDefined();
    expect(group.slug).toBe(groupSlug);

    // Create invite
    const invite = await createInvite({
      groupId: group.id,
      ownerId: testUserId,
      multiUse: true,
    });
    expect(invite.token).toBeDefined();

    // Member joins via token
    const newMemberId = "00000000-0000-0000-0000-000000000003";
    const joinResult = await joinGroupByToken({
      userId: newMemberId,
      token: invite.token,
    });
    expect(joinResult.success).toBe(true);

    // Members list
    const members = await listGroupMembers({ groupId: group.id });
    expect(members.length).toBeGreaterThanOrEqual(1);

    // Leaderboard compute
    const snapshot = await computeLeaderboard(group.id);
    expect(snapshot).toBeDefined();
    expect(Array.isArray(snapshot.rankings)).toBe(true);
  });

  it("Flow 4: MCP Agent Workflow -> generate key, verify, and publish showcase with source='agent'", async () => {
    const keyData = await generateApiKey({
      userId: testUserId,
      name: "Cursor IDE Agent",
      scopes: ["showcase:write"],
    });
    expect(keyData.token).toMatch(/^pholio_live_/);

    const authResult = await verifyApiKey(keyData.token);
    expect(authResult).not.toBeNull();
    expect(authResult?.userId).toBe(testUserId);

    // Publish via agent
    const agentShowcase = await publishShowcase({
      ownerId: testUserId,
      projectId: testProjectId,
      body: "Autonomous AI agent deployed updates and verified tests via MCP.",
      source: "agent",
    });
    expect(agentShowcase.source).toBe("agent");
  });
});
