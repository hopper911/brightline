/** Studio OS — verified @brightlinephotography.com outbound identities (Resend). */

export const BRIGHTLINE_DEFAULT_SENDER = "hello@brightlinephotography.com";

const DEFAULT_ALLOWED_SENDERS = [
  "hello@brightlinephotography.com",
  "bookings@brightlinephotography.com",
  "kiril@brightlinephotography.com",
  "info@brightlinephotography.com",
] as const;

export function normalizeBrightlineEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function getBrightlineAllowedSenders(): string[] {
  const raw = process.env.STUDIO_OS_EMAIL_ALLOWED_SENDERS?.trim();
  if (!raw) {
    return [...DEFAULT_ALLOWED_SENDERS];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const e = normalizeBrightlineEmail(part);
    if (e && !seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_ALLOWED_SENDERS];
}

export function getDefaultBrightlineSender(): string {
  const allowed = getBrightlineAllowedSenders();
  const preferred = normalizeBrightlineEmail(BRIGHTLINE_DEFAULT_SENDER);
  if (allowed.includes(preferred)) return preferred;
  return allowed[0] ?? BRIGHTLINE_DEFAULT_SENDER;
}

export function isAllowedBrightlineSender(email: string): boolean {
  return getBrightlineAllowedSenders().includes(normalizeBrightlineEmail(email));
}

export function requireAllowedBrightlineSender(email: string): string {
  const n = normalizeBrightlineEmail(email);
  if (!isAllowedBrightlineSender(n)) {
    throw new Error("From address is not an allowed sender.");
  }
  return n;
}

export function getBrightlineEmailDisplayName(): string {
  const fromEnv = process.env.STUDIO_OS_EMAIL_FROM_NAME?.trim();
  return fromEnv || "Bright Line Photography";
}

/** Gmail (or other inbox) that receives Cloudflare-routed mail — display only, no secrets. */
export function getStudioInboxDisplayEmail(): string | undefined {
  const explicit = process.env.STUDIO_OS_INBOX_EMAIL?.trim();
  if (explicit) return explicit;
  const imapUser = process.env.STUDIO_OS_IMAP_USER?.trim();
  return imapUser || undefined;
}

export function formatBrightlineFromHeader(fromEmail: string): string {
  const name = getBrightlineEmailDisplayName();
  const email = normalizeBrightlineEmail(fromEmail);
  return `"${name}" <${email}>`;
}
