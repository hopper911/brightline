-- Mission Control email connection: account metadata, synced threads/messages, and outbound drafts.
CREATE TYPE "StudioEmailProvider" AS ENUM ('SMTP_IMAP', 'RESEND');
CREATE TYPE "StudioEmailDraftStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

CREATE TABLE "StudioEmailAccount" (
    "id" TEXT NOT NULL,
    "provider" "StudioEmailProvider" NOT NULL DEFAULT 'SMTP_IMAP',
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioEmailAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioEmailThread" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalThreadId" TEXT,
    "subject" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "toEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "snippet" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT false,
    "triagedAt" TIMESTAMP(3),
    "matchedClientId" TEXT,
    "matchedLeadId" TEXT,
    "matchedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioEmailThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioEmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "toEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ccEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "snippet" TEXT,
    "textPreview" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "isUnread" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioEmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioEmailDraft" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "StudioEmailDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioEmailDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioEmailAccount_emailAddress_idx" ON "StudioEmailAccount"("emailAddress");
CREATE INDEX "StudioEmailAccount_isActive_idx" ON "StudioEmailAccount"("isActive");
CREATE INDEX "StudioEmailAccount_lastSyncedAt_idx" ON "StudioEmailAccount"("lastSyncedAt");

CREATE UNIQUE INDEX "StudioEmailThread_accountId_externalThreadId_key" ON "StudioEmailThread"("accountId", "externalThreadId");
CREATE INDEX "StudioEmailThread_accountId_lastMessageAt_idx" ON "StudioEmailThread"("accountId", "lastMessageAt");
CREATE INDEX "StudioEmailThread_unread_idx" ON "StudioEmailThread"("unread");
CREATE INDEX "StudioEmailThread_matchedClientId_idx" ON "StudioEmailThread"("matchedClientId");
CREATE INDEX "StudioEmailThread_matchedLeadId_idx" ON "StudioEmailThread"("matchedLeadId");
CREATE INDEX "StudioEmailThread_matchedProjectId_idx" ON "StudioEmailThread"("matchedProjectId");

CREATE UNIQUE INDEX "StudioEmailMessage_threadId_providerMessageId_key" ON "StudioEmailMessage"("threadId", "providerMessageId");
CREATE INDEX "StudioEmailMessage_threadId_idx" ON "StudioEmailMessage"("threadId");
CREATE INDEX "StudioEmailMessage_fromEmail_idx" ON "StudioEmailMessage"("fromEmail");
CREATE INDEX "StudioEmailMessage_receivedAt_idx" ON "StudioEmailMessage"("receivedAt");

CREATE INDEX "StudioEmailDraft_accountId_idx" ON "StudioEmailDraft"("accountId");
CREATE INDEX "StudioEmailDraft_status_idx" ON "StudioEmailDraft"("status");
CREATE INDEX "StudioEmailDraft_entityType_entityId_idx" ON "StudioEmailDraft"("entityType", "entityId");

ALTER TABLE "StudioEmailThread" ADD CONSTRAINT "StudioEmailThread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudioEmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioEmailThread" ADD CONSTRAINT "StudioEmailThread_matchedClientId_fkey" FOREIGN KEY ("matchedClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioEmailThread" ADD CONSTRAINT "StudioEmailThread_matchedLeadId_fkey" FOREIGN KEY ("matchedLeadId") REFERENCES "StudioLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioEmailThread" ADD CONSTRAINT "StudioEmailThread_matchedProjectId_fkey" FOREIGN KEY ("matchedProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioEmailMessage" ADD CONSTRAINT "StudioEmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "StudioEmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioEmailDraft" ADD CONSTRAINT "StudioEmailDraft_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudioEmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
