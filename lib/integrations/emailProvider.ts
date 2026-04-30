import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  formatBrightlineFromHeader,
  getBrightlineAllowedSenders,
  getBrightlineEmailDisplayName,
  getDefaultBrightlineSender,
  getStudioInboxDisplayEmail,
  requireAllowedBrightlineSender,
} from "@/lib/studio/brightline-email-senders";

export type EmailDraft = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Must be in STUDIO_OS_EMAIL_ALLOWED_SENDERS (server-validated). */
  fromEmail?: string;
};

export type SyncedEmailMessage = {
  providerMessageId: string;
  externalThreadId: string;
  subject: string;
  fromName?: string | null;
  fromEmail?: string | null;
  toEmails: string[];
  ccEmails: string[];
  snippet?: string | null;
  textPreview?: string | null;
  receivedAt: Date;
  sentAt?: Date | null;
  isUnread: boolean;
};

export type EmailProviderStatus = {
  provider: "smtp_imap" | "resend" | "none";
  configured: boolean;
  emailAddress?: string;
  displayName?: string;
  missing: string[];
  /** Gmail (etc.) that receives forwarded inbound mail — from env, not secrets. */
  inboxEmail?: string;
  defaultFromEmail?: string;
  allowedFromEmails?: string[];
  smtpConfigured?: boolean;
  imapConfigured?: boolean;
};

export type EmailProvider = {
  name: string;
  status(): EmailProviderStatus;
  createDraft(input: EmailDraft): Promise<{ provider: string; id?: string }>;
  send(input: EmailDraft): Promise<{ provider: string; messageId?: string }>;
  syncInbox(options?: { since?: Date; limit?: number }): Promise<SyncedEmailMessage[]>;
};

function envString(name: string) {
  return process.env[name]?.trim() || "";
}

function envBool(name: string, fallback: boolean) {
  const value = envString(name).toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function envPort(name: string, fallback: number) {
  const raw = Number(envString(name));
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : fallback;
}

function smtpVarsPresent(): boolean {
  return [
    "STUDIO_OS_EMAIL_ADDRESS",
    "STUDIO_OS_SMTP_HOST",
    "STUDIO_OS_SMTP_USER",
    "STUDIO_OS_SMTP_PASS",
  ].every((key) => envString(key));
}

function imapVarsPresent(): boolean {
  return ["STUDIO_OS_IMAP_HOST", "STUDIO_OS_IMAP_USER", "STUDIO_OS_IMAP_PASS"].every(
    (key) => envString(key)
  );
}

function dashboardExtras(): Pick<
  EmailProviderStatus,
  "inboxEmail" | "defaultFromEmail" | "allowedFromEmails" | "smtpConfigured" | "imapConfigured"
> {
  return {
    inboxEmail: getStudioInboxDisplayEmail(),
    defaultFromEmail: getDefaultBrightlineSender(),
    allowedFromEmails: getBrightlineAllowedSenders(),
    smtpConfigured: smtpVarsPresent(),
    imapConfigured: imapVarsPresent(),
  };
}

function collectAddresses(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("value" in value)) return [];
  const addresses = (value as { value?: unknown }).value;
  if (!Array.isArray(addresses)) return [];
  return addresses
    .map((entry) =>
      entry && typeof entry === "object" && "address" in entry
        ? String((entry as { address?: unknown }).address ?? "").trim().toLowerCase()
        : ""
    )
    .filter(Boolean);
}

function firstAddress(value: unknown) {
  if (!value || typeof value !== "object" || !("value" in value)) return {};
  const addresses = (value as { value?: unknown }).value;
  if (!Array.isArray(addresses)) return {};
  const first = addresses[0];
  if (!first || typeof first !== "object") return {};
  return {
    name:
      "name" in first && typeof first.name === "string"
        ? first.name.trim() || null
        : null,
    email:
      "address" in first && typeof first.address === "string"
        ? first.address.trim().toLowerCase() || null
        : null,
  };
}

function textSnippet(input?: string | null, max = 240) {
  const text = (input || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

async function fetchImapInboxMessages(options?: { since?: Date; limit?: number }) {
  if (!imapVarsPresent()) {
    throw new Error(
      "IMAP is not configured (need STUDIO_OS_IMAP_HOST, STUDIO_OS_IMAP_USER, STUDIO_OS_IMAP_PASS)."
    );
  }

  const since =
    options?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 100));
  const client = new ImapFlow({
    host: envString("STUDIO_OS_IMAP_HOST"),
    port: envPort("STUDIO_OS_IMAP_PORT", 993),
    secure: envBool("STUDIO_OS_IMAP_SECURE", true),
    auth: {
      user: envString("STUDIO_OS_IMAP_USER"),
      pass: envString("STUDIO_OS_IMAP_PASS"),
    },
    logger: false,
  });

  const messages: SyncedEmailMessage[] = [];
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    for await (const message of client.fetch(
      { since },
      { uid: true, envelope: true, flags: true, internalDate: true, source: true }
    )) {
      if (messages.length >= limit) break;
      if (!message.source) continue;
      const parsed = await simpleParser(message.source as Buffer);
      const from = firstAddress(parsed.from);
      const htmlText =
        typeof parsed.html === "string" ? parsed.html.replace(/<[^>]*>/g, " ") : "";
      const text = parsed.text || htmlText;
      const internalDate =
        message.internalDate instanceof Date
          ? message.internalDate
          : message.internalDate
            ? new Date(message.internalDate)
            : new Date();
      const providerMessageId =
        parsed.messageId || `${message.uid}-${internalDate.getTime()}`;
      const subject = parsed.subject || message.envelope?.subject || "(no subject)";
      const references = Array.isArray(parsed.references)
        ? parsed.references
        : parsed.references
          ? [parsed.references]
          : [];

      messages.push({
        providerMessageId,
        externalThreadId:
          parsed.inReplyTo ||
          references[0] ||
          parsed.messageId ||
          `${subject}-${from.email || "unknown"}`,
        subject,
        fromName: from.name,
        fromEmail: from.email,
        toEmails: collectAddresses(parsed.to),
        ccEmails: collectAddresses(parsed.cc),
        snippet: textSnippet(text),
        textPreview: textSnippet(text, 1000),
        receivedAt: internalDate ?? parsed.date ?? new Date(),
        sentAt: parsed.date ?? null,
        isUnread: message.flags ? !message.flags.has("\\Seen") : false,
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }

  return messages.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
}

function smtpImapStatus(): EmailProviderStatus {
  const required = [
    "STUDIO_OS_EMAIL_ADDRESS",
    "STUDIO_OS_SMTP_HOST",
    "STUDIO_OS_SMTP_USER",
    "STUDIO_OS_SMTP_PASS",
    "STUDIO_OS_IMAP_HOST",
    "STUDIO_OS_IMAP_USER",
    "STUDIO_OS_IMAP_PASS",
  ];
  const missing = required.filter((key) => !envString(key));
  const dash = dashboardExtras();
  return {
    provider: "smtp_imap",
    configured: missing.length === 0,
    emailAddress: envString("STUDIO_OS_EMAIL_ADDRESS") || undefined,
    displayName: getBrightlineEmailDisplayName(),
    missing,
    ...dash,
  };
}

const smtpImapProvider: EmailProvider = {
  name: "smtp-imap",

  status() {
    return smtpImapStatus();
  },

  async createDraft() {
    return { provider: this.name };
  },

  async send(input) {
    const status = smtpImapStatus();
    if (!status.configured) {
      throw new Error(`Email provider is missing: ${status.missing.join(", ")}`);
    }

    const resolvedFrom = requireAllowedBrightlineSender(
      input.fromEmail ?? getDefaultBrightlineSender()
    );
    const fromHeader = formatBrightlineFromHeader(resolvedFrom);

    const transporter = nodemailer.createTransport({
      host: envString("STUDIO_OS_SMTP_HOST"),
      port: envPort("STUDIO_OS_SMTP_PORT", 587),
      secure: envBool("STUDIO_OS_SMTP_SECURE", false),
      auth: {
        user: envString("STUDIO_OS_SMTP_USER"),
        pass: envString("STUDIO_OS_SMTP_PASS"),
      },
    });

    const result = await transporter.sendMail({
      from: fromHeader,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return {
      provider: this.name,
      messageId: result.messageId,
    };
  },

  async syncInbox(options) {
    const status = smtpImapStatus();
    if (!status.configured) {
      throw new Error(`Email provider is missing: ${status.missing.join(", ")}`);
    }
    return fetchImapInboxMessages(options);
  },
};

function resendStatus(): EmailProviderStatus {
  const apiKey = envString("RESEND_API_KEY");
  const configured = Boolean(apiKey);
  const dash = dashboardExtras();
  return {
    provider: "resend",
    configured,
    emailAddress: configured ? getDefaultBrightlineSender() : undefined,
    displayName: getBrightlineEmailDisplayName(),
    missing: configured ? [] : ["RESEND_API_KEY"],
    ...dash,
    smtpConfigured: configured,
    imapConfigured: dash.imapConfigured,
  };
}

const resendStudioProvider: EmailProvider = {
  name: "resend",

  status() {
    return resendStatus();
  },

  async createDraft() {
    return { provider: this.name };
  },

  async send(input) {
    const apiKey = envString("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set.");
    }
    const resolvedFrom = requireAllowedBrightlineSender(
      input.fromEmail ?? getDefaultBrightlineSender()
    );
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: formatBrightlineFromHeader(resolvedFrom),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) {
      throw new Error(error.message);
    }
    return {
      provider: this.name,
      messageId: data?.id,
    };
  },

  async syncInbox(options) {
    if (!imapVarsPresent()) {
      return [];
    }
    return fetchImapInboxMessages(options);
  },
};

export function getEmailProvider(): EmailProvider | null {
  const provider = envString("STUDIO_OS_EMAIL_PROVIDER").toLowerCase();
  if (provider === "smtp_imap") return smtpImapProvider;
  if (provider === "resend") return resendStudioProvider;
  return null;
}

export function getEmailProviderStatus(): EmailProviderStatus {
  const p = getEmailProvider();
  if (!p) {
    return {
      provider: "none",
      configured: false,
      missing: ["STUDIO_OS_EMAIL_PROVIDER"],
      ...dashboardExtras(),
      smtpConfigured: false,
      imapConfigured: false,
    };
  }
  return p.status();
}
