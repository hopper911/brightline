import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/stripe-invoices";
import {
  formatBrightlineFromHeader,
  getDefaultBrightlineSender,
} from "@/lib/studio/brightline-email-senders";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendDeliveryPackageEmailInput = {
  to: string;
  clientName: string;
  projectTitle: string;
  packageTitle: string;
  deliveryMessage?: string | null;
  packageUrl: string;
  usageRightsSummary?: string | null;
};

/**
 * Minimal premium transactional email for client delivery (Resend).
 */
export async function sendDeliveryPackageEmail(input: SendDeliveryPackageEmailInput): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const resend = new Resend(apiKey);
  const from = formatBrightlineFromHeader(getDefaultBrightlineSender());
  const subject = `Your delivery is ready — ${input.packageTitle}`;
  const plainLines = [
    `${input.clientName},`,
    "",
    `Your images for ${input.projectTitle} are ready to view and download.`,
    "",
    input.deliveryMessage?.trim() ?? "",
    "",
    `Open your private gallery: ${input.packageUrl}`,
    "",
    input.usageRightsSummary?.trim()
      ? `Usage: ${input.usageRightsSummary.trim()}`
      : "Usage is outlined in your agreement with Bright Line Photography.",
    "",
    "— Bright Line Photography",
    "",
    "Support: reply to this email or contact the studio directly.",
  ].filter(Boolean);

  const html = `
<!DOCTYPE html>
<html><body style="margin:0;background:#0a0a0a;color:#e8e8e8;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;border:1px solid #2a2a2a;border-radius:12px;padding:28px 24px;background:#111;">
        <tr><td style="font-size:11px;letter-spacing:0.35em;color:#888;text-transform:uppercase;">Bright Line</td></tr>
        <tr><td style="padding-top:12px;font-size:22px;font-weight:600;color:#f5f5f5;">${escapeHtml(input.packageTitle)}</td></tr>
        <tr><td style="padding-top:8px;font-size:14px;color:#aaa;">${escapeHtml(input.clientName)} · ${escapeHtml(input.projectTitle)}</td></tr>
        ${
          input.deliveryMessage?.trim()
            ? `<tr><td style="padding-top:20px;font-size:15px;color:#ccc;">${escapeHtml(input.deliveryMessage.trim())}</td></tr>`
            : ""
        }
        <tr><td style="padding-top:28px;">
          <a href="${escapeHtml(input.packageUrl)}" style="display:inline-block;background:#f5f5f5;color:#111;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Open delivery</a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:13px;color:#888;">
          ${escapeHtml(input.usageRightsSummary?.trim() ?? "Usage is outlined in your agreement with Bright Line Photography.")}
        </td></tr>
        <tr><td style="padding-top:32px;font-size:12px;color:#555;">Support: reply to this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: plainLines.join("\n"),
    html,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}

export function deliveryPackagePublicUrl(accessToken: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/package/${accessToken}`;
}
