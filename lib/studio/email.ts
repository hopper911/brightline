import { prisma } from "@/lib/prisma";
import {
  getEmailProvider,
  getEmailProviderStatus,
  type EmailDraft,
  type SyncedEmailMessage,
} from "@/lib/integrations/emailProvider";
import {
  getDefaultBrightlineSender,
  requireAllowedBrightlineSender,
} from "@/lib/studio/brightline-email-senders";

function normalizeEmail(input?: string | null) {
  return input?.trim().toLowerCase() || "";
}

function textSnippet(input?: string | null, max = 240) {
  const text = (input || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function ensureStudioEmailAccount() {
  const status = getEmailProviderStatus();
  if (status.provider === "none" || !status.emailAddress) return null;

  const existing = await prisma.studioEmailAccount.findFirst({
    where: {
      emailAddress: { equals: status.emailAddress, mode: "insensitive" },
      provider: status.provider === "smtp_imap" ? "SMTP_IMAP" : "RESEND",
    },
  });

  const data = {
    provider: status.provider === "smtp_imap" ? "SMTP_IMAP" as const : "RESEND" as const,
    emailAddress: status.emailAddress,
    displayName: status.displayName ?? null,
    smtpHost: process.env.STUDIO_OS_SMTP_HOST?.trim() || null,
    smtpPort: process.env.STUDIO_OS_SMTP_PORT
      ? Number(process.env.STUDIO_OS_SMTP_PORT)
      : null,
    smtpSecure: process.env.STUDIO_OS_SMTP_SECURE === "true",
    imapHost: process.env.STUDIO_OS_IMAP_HOST?.trim() || null,
    imapPort: process.env.STUDIO_OS_IMAP_PORT
      ? Number(process.env.STUDIO_OS_IMAP_PORT)
      : null,
    imapSecure: process.env.STUDIO_OS_IMAP_SECURE !== "false",
    isActive: true,
  };

  if (existing) {
    return prisma.studioEmailAccount.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.studioEmailAccount.create({ data });
}

async function matchEmail(message: SyncedEmailMessage) {
  const fromEmail = normalizeEmail(message.fromEmail);
  if (!fromEmail) {
    return { matchedClientId: null, matchedLeadId: null, matchedProjectId: null };
  }

  const [client, lead] = await Promise.all([
    prisma.studioClient.findFirst({
      where: { email: { equals: fromEmail, mode: "insensitive" } },
      select: { id: true, companyName: true },
    }),
    prisma.studioLead.findFirst({
      where: { email: { equals: fromEmail, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, convertedProjectId: true },
    }),
  ]);

  const project = client
    ? await prisma.studioProject.findFirst({
        where: {
          OR: [
            { clientId: client.id },
            { client: { contains: client.companyName, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      })
    : lead?.convertedProjectId
      ? { id: lead.convertedProjectId }
      : null;

  return {
    matchedClientId: client?.id ?? null,
    matchedLeadId: lead?.id ?? null,
    matchedProjectId: project?.id ?? null,
  };
}

export async function syncStudioEmailInbox(options?: { limit?: number }) {
  const provider = getEmailProvider();
  if (!provider) {
    throw new Error("Email provider is not configured.");
  }

  const status = provider.status();
  if (!status.configured) {
    throw new Error(`Email provider is missing: ${status.missing.join(", ")}`);
  }

  const account = await ensureStudioEmailAccount();
  if (!account) {
    throw new Error("Email account could not be initialized.");
  }

  const since =
    account.lastSyncedAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const messages = await provider.syncInbox({
    since,
    limit: options?.limit ?? 50,
  });

  let created = 0;
  let updated = 0;

  for (const message of messages) {
    const match = await matchEmail(message);
    const externalThreadId =
      message.externalThreadId || `${message.subject}-${message.fromEmail ?? "unknown"}`;
    const thread = await prisma.studioEmailThread.upsert({
      where: {
        accountId_externalThreadId: {
          accountId: account.id,
          externalThreadId,
        },
      },
      create: {
        accountId: account.id,
        externalThreadId,
        subject: message.subject,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        toEmails: message.toEmails,
        snippet: message.snippet,
        lastMessageAt: message.receivedAt,
        unread: message.isUnread,
        ...match,
      },
      update: {
        subject: message.subject,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        toEmails: message.toEmails,
        snippet: message.snippet,
        lastMessageAt: message.receivedAt,
        unread: message.isUnread,
        ...match,
      },
    });

    const existingMessage = await prisma.studioEmailMessage.findUnique({
      where: {
        threadId_providerMessageId: {
          threadId: thread.id,
          providerMessageId: message.providerMessageId,
        },
      },
      select: { id: true },
    });

    await prisma.studioEmailMessage.upsert({
      where: {
        threadId_providerMessageId: {
          threadId: thread.id,
          providerMessageId: message.providerMessageId,
        },
      },
      create: {
        threadId: thread.id,
        providerMessageId: message.providerMessageId,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        toEmails: message.toEmails,
        ccEmails: message.ccEmails,
        subject: message.subject,
        snippet: message.snippet,
        textPreview: message.textPreview,
        receivedAt: message.receivedAt,
        sentAt: message.sentAt,
        isUnread: message.isUnread,
      },
      update: {
        snippet: message.snippet,
        textPreview: message.textPreview,
        isUnread: message.isUnread,
      },
    });

    if (existingMessage) updated += 1;
    else created += 1;
  }

  await prisma.studioEmailAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });

  return {
    accountId: account.id,
    fetched: messages.length,
    created,
    updated,
  };
}

export async function createStudioEmailDraft(input: EmailDraft & {
  entityType?: string | null;
  entityId?: string | null;
}) {
  const account = await ensureStudioEmailAccount();
  if (!account) throw new Error("Email account is not configured.");
  const toEmail = normalizeEmail(input.to);
  if (!toEmail) throw new Error("to is required.");
  if (!input.subject.trim()) throw new Error("subject is required.");
  if (!input.text.trim()) throw new Error("text is required.");
  const fromEmail = requireAllowedBrightlineSender(
    input.fromEmail ?? getDefaultBrightlineSender()
  );

  return prisma.studioEmailDraft.create({
    data: {
      accountId: account.id,
      fromEmail,
      toEmail,
      subject: input.subject.trim(),
      text: input.text.trim(),
      html: input.html?.trim() || null,
      entityType: input.entityType?.trim() || null,
      entityId: input.entityId?.trim() || null,
    },
  });
}

export async function sendStudioEmailDraft(draftId: string) {
  const provider = getEmailProvider();
  if (!provider) throw new Error("Email provider is not configured.");

  const draft = await prisma.studioEmailDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) throw new Error("Draft not found.");

  try {
    const fromEmail = requireAllowedBrightlineSender(
      draft.fromEmail ?? getDefaultBrightlineSender()
    );
    const result = await provider.send({
      to: draft.toEmail,
      subject: draft.subject,
      text: draft.text,
      html: draft.html ?? undefined,
      fromEmail,
    });
    await prisma.studioEmailDraft.update({
      where: { id: draft.id },
      data: { status: "SENT", sentAt: new Date(), error: null },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed.";
    await prisma.studioEmailDraft.update({
      where: { id: draft.id },
      data: { status: "FAILED", error: textSnippet(message, 500) },
    });
    throw err;
  }
}
