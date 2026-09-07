import { describe, it, expect } from "vitest";
import {
  sendEmail,
  buildDigestEmail,
  buildSpikeEmail,
  buildInviteEmail,
  sendNotificationEmail,
} from "./email";
import { APP_URL, inviteUrl } from "@/lib/env";

describe("Email notification service", () => {
  it("gracefully falls back when RESEND_API_KEY is not configured", async () => {
    const res = await sendEmail({
      to: "builder@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(res.success).toBe(true);
    expect(res.mocked).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it("builds digest email with rankings and APP_URL link", () => {
    const template = buildDigestEmail({
      userName: "Tobi",
      groupName: "Lagos Hackers",
      groupSlug: "lagos-hackers",
      topRankers: [
        { rank: 1, name: "Tobi Samson", score: 95 },
        { rank: 2, name: "Siddharth Arun", score: 72 },
      ],
      totalPushes: 14,
      totalShowcases: 5,
    });

    expect(template.subject).toContain("Weekly Leaderboard Digest: Lagos Hackers");
    expect(template.html).toContain(`${APP_URL}/hacker-groups/lagos-hackers`);
    expect(template.html).toContain("Tobi Samson");
    expect(template.html).toContain("95 pts");
    expect(template.text).toContain("14");
    expect(template.text).toContain(`${APP_URL}/hacker-groups/lagos-hackers`);
  });

  it("builds spike email with growth percentage and APP_URL link", () => {
    const template = buildSpikeEmail({
      userName: "Siddharth",
      groupName: "YC W26 Builders",
      groupSlug: "yc-w26",
      spikePercent: 55,
      actives7d: 8,
    });

    expect(template.subject).toContain("+55% in YC W26 Builders");
    expect(template.html).toContain("+55% Active Growth");
    expect(template.html).toContain("8 active builders");
    expect(template.html).toContain(`${APP_URL}/hacker-groups/yc-w26`);
    expect(template.text).toContain(`${APP_URL}/hacker-groups/yc-w26`);
  });

  it("builds invite email with token link", () => {
    const token = "inv-test-token-123";
    const template = buildInviteEmail({
      inviterName: "Tobi",
      groupName: "Lagos Hackers",
      token,
    });

    const expectedUrl = inviteUrl(token);
    expect(template.subject).toContain("You've been invited to join Lagos Hackers on Pholio");
    expect(template.html).toContain(expectedUrl);
    expect(template.html).toContain("Tobi has invited you");
    expect(template.text).toContain(expectedUrl);
  });

  it("dispatches notification email through sendNotificationEmail", async () => {
    const res = await sendNotificationEmail({
      to: "builder@example.com",
      type: "spike",
      payload: {
        groupName: "Lagos Hackers",
        groupSlug: "lagos-hackers",
        spikePercent: 45,
        actives7d: 5,
      },
    });

    expect(res.success).toBe(true);
  });
});
