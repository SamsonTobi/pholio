import { Resend } from "resend";
import { env, APP_URL, inviteUrl } from "@/lib/env";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

/**
 * Sends an email via Resend with graceful fallback if RESEND_API_KEY is not configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const { to, subject, html, text, from = "Pholio <notifications@pholio.dev>" } = options;

  if (!env.RESEND_API_KEY) {
    return {
      success: true,
      mocked: true,
      messageId: `mock-email-${Date.now()}`,
    };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return {
      success: false,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export interface DigestTemplateData {
  userName?: string;
  groupName: string;
  groupSlug: string;
  topRankers?: Array<{ rank: number; name: string; score: number }>;
  totalPushes?: number;
  totalShowcases?: number;
}

export function buildDigestEmail(data: DigestTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const groupUrl = `${APP_URL}/hacker-groups/${data.groupSlug}`;
  const subject = `Weekly Leaderboard Digest: ${data.groupName}`;

  const rankersHtml = (data.topRankers || [])
    .map(
      (r) => `
        <tr style="border-bottom: 1px solid #262626;">
          <td style="padding: 10px 12px; color: #a3a3a3; font-size: 14px;">#${r.rank}</td>
          <td style="padding: 10px 12px; color: #f5f5f5; font-size: 14px; font-weight: 500;">${r.name}</td>
          <td style="padding: 10px 12px; color: #a3a3a3; font-size: 14px; text-align: right;">${r.score} pts</td>
        </tr>
      `
    )
    .join("");

  const rankersText = (data.topRankers || [])
    .map((r) => `#${r.rank} ${r.name} - ${r.score} pts`)
    .join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif; color: #f5f5f5;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #171717; border: 1px solid #262626; border-radius: 12px; overflow: hidden; padding: 32px;">
          <tr>
            <td>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #a3a3a3; margin-bottom: 8px;">Weekly Digest</div>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">${data.groupName} Leaderboard</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #a3a3a3;">
                Here is your weekly summary of builder activity and leaderboard standings.
              </p>

              ${
                data.totalPushes !== undefined || data.totalShowcases !== undefined
                  ? `
                  <div style="display: flex; gap: 16px; margin-bottom: 24px; padding: 16px; background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px;">
                    <div style="flex: 1;">
                      <div style="font-size: 12px; color: #737373;">Total Pushes (7d)</div>
                      <div style="font-size: 20px; font-weight: 600; color: #ffffff;">${data.totalPushes ?? 0}</div>
                    </div>
                    <div style="flex: 1;">
                      <div style="font-size: 12px; color: #737373;">Showcase Updates (7d)</div>
                      <div style="font-size: 20px; font-weight: 600; color: #ffffff;">${data.totalShowcases ?? 0}</div>
                    </div>
                  </div>
                  `
                  : ""
              }

              ${
                data.topRankers && data.topRankers.length > 0
                  ? `
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid #262626;">
                        <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #737373; font-weight: 500;">Rank</th>
                        <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #737373; font-weight: 500;">Builder</th>
                        <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #737373; font-weight: 500;">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rankersHtml}
                    </tbody>
                  </table>
                  `
                  : ""
              }

              <div style="text-align: center; margin-top: 32px;">
                <a href="${groupUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 500; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                  View Full Leaderboard
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Weekly Leaderboard Digest: ${data.groupName}

Here is your weekly summary of builder activity and leaderboard standings:
${data.totalPushes !== undefined ? `Total Pushes (7d): ${data.totalPushes}\n` : ""}${data.totalShowcases !== undefined ? `Showcase Updates (7d): ${data.totalShowcases}\n` : ""}
${rankersText}

View Full Leaderboard: ${groupUrl}
  `.trim();

  return { subject, html, text };
}

export interface SpikeTemplateData {
  userName?: string;
  groupName: string;
  groupSlug: string;
  spikePercent: number;
  actives7d: number;
}

export function buildSpikeEmail(data: SpikeTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const groupUrl = `${APP_URL}/hacker-groups/${data.groupSlug}`;
  const subject = `Activity Spike Detected: +${data.spikePercent}% in ${data.groupName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif; color: #f5f5f5;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #171717; border: 1px solid #262626; border-radius: 12px; overflow: hidden; padding: 32px;">
          <tr>
            <td>
              <div style="display: inline-block; padding: 4px 10px; background-color: #262626; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #52e396; margin-bottom: 16px;">
                +${data.spikePercent}% Active Growth
              </div>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">Growth Spike in ${data.groupName}!</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #a3a3a3;">
                ${data.groupName} experienced a rapid surge in shipping activity with <strong>${data.actives7d} active builders</strong> over the last 48 hours.
              </p>

              <div style="text-align: center; margin-top: 32px;">
                <a href="${groupUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 500; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                  Check the Standings
                </a>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Growth Spike in ${data.groupName}!

${data.groupName} experienced a +${data.spikePercent}% increase in active builders over the last 48 hours, reaching ${data.actives7d} active contributors.

View Standings: ${groupUrl}
  `.trim();

  return { subject, html, text };
}

export interface InviteTemplateData {
  inviterName?: string;
  groupName: string;
  token: string;
}

export function buildInviteEmail(data: InviteTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const joinUrl = inviteUrl(data.token);
  const subject = `You've been invited to join ${data.groupName} on Pholio`;
  const inviterText = data.inviterName ? `${data.inviterName} has invited you` : "You have been invited";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif; color: #f5f5f5;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #171717; border: 1px solid #262626; border-radius: 12px; overflow: hidden; padding: 32px;">
          <tr>
            <td>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #a3a3a3; margin-bottom: 8px;">Invitation</div>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">Join ${data.groupName}</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #a3a3a3;">
                ${inviterText} to join the <strong>${data.groupName}</strong> hacker community on Pholio to track live project shipping and compete on the leaderboard.
              </p>

              <div style="text-align: center; margin-top: 32px;">
                <a href="${joinUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 500; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin-top: 32px; font-size: 12px; color: #737373; text-align: center;">
                Or copy and paste this URL into your browser: <br />
                <a href="${joinUrl}" style="color: #a3a3a3; text-decoration: underline;">${joinUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Join ${data.groupName} on Pholio

${inviterText} to join the ${data.groupName} hacker community.

Accept your invitation here:
${joinUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * Sends a notification email given the type and corresponding payload.
 */
export async function sendNotificationEmail(params: {
  to: string | string[];
  type: "digest" | "spike" | "invite";
  payload: Record<string, any>;
}): Promise<EmailSendResult> {
  let template: { subject: string; html: string; text: string };

  switch (params.type) {
    case "digest":
      template = buildDigestEmail({
        userName: params.payload.userName,
        groupName: params.payload.groupName || "Hacker Group",
        groupSlug: params.payload.groupSlug || "group",
        topRankers: params.payload.topRankers,
        totalPushes: params.payload.totalPushes,
        totalShowcases: params.payload.totalShowcases,
      });
      break;
    case "spike":
      template = buildSpikeEmail({
        userName: params.payload.userName,
        groupName: params.payload.groupName || "Hacker Group",
        groupSlug: params.payload.groupSlug || "group",
        spikePercent: params.payload.spikePercent || 40,
        actives7d: params.payload.actives7d || 1,
      });
      break;
    case "invite":
      template = buildInviteEmail({
        inviterName: params.payload.inviterName,
        groupName: params.payload.groupName || "Hacker Group",
        token: params.payload.token,
      });
      break;
  }

  return sendEmail({
    to: params.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
