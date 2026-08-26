-- Brightline Accountant Portal

-- CreateEnum
CREATE TYPE "StudioPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "AccountingNoteAuthorType" AS ENUM ('OWNER', 'ACCOUNTANT', 'SYSTEM');

-- AlterTable
ALTER TABLE "StudioPayment" ADD COLUMN "recordStatus" "StudioPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "paymentMethod" TEXT;

CREATE INDEX "StudioPayment_recordStatus_idx" ON "StudioPayment"("recordStatus");

-- AlterTable
ALTER TABLE "StudioExpense" ADD COLUMN "studioClientId" TEXT,
ADD COLUMN "title" TEXT,
ADD COLUMN "vendor" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "paymentMethod" TEXT;

CREATE INDEX "StudioExpense_studioClientId_idx" ON "StudioExpense"("studioClientId");

ALTER TABLE "StudioExpense" ADD CONSTRAINT "StudioExpense_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountantAccess" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "totpSecret" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountantAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountantAccess_email_key" ON "AccountantAccess"("email");

CREATE INDEX "AccountantAccess_isActive_idx" ON "AccountantAccess"("isActive");

CREATE INDEX "AccountantAccess_accessExpiresAt_idx" ON "AccountantAccess"("accessExpiresAt");

ALTER TABLE "AccountantAccess" ADD CONSTRAINT "AccountantAccess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AccountantAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountantPermission" (
    "id" TEXT NOT NULL,
    "accountantAccessId" TEXT NOT NULL,
    "canViewInvoices" BOOLEAN NOT NULL DEFAULT true,
    "canViewPayments" BOOLEAN NOT NULL DEFAULT true,
    "canViewExpenses" BOOLEAN NOT NULL DEFAULT true,
    "canViewTransactions" BOOLEAN NOT NULL DEFAULT true,
    "canUploadReceipts" BOOLEAN NOT NULL DEFAULT true,
    "canExportReports" BOOLEAN NOT NULL DEFAULT true,
    "canDownloadDocuments" BOOLEAN NOT NULL DEFAULT true,
    "canAddAccountingNotes" BOOLEAN NOT NULL DEFAULT true,
    "canViewProjectFinancials" BOOLEAN NOT NULL DEFAULT false,
    "canEditExpenseCategories" BOOLEAN NOT NULL DEFAULT false,
    "canCreateExpenses" BOOLEAN NOT NULL DEFAULT false,
    "canEditExpenses" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccountantPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountantPermission_accountantAccessId_key" ON "AccountantPermission"("accountantAccessId");

ALTER TABLE "AccountantPermission" ADD CONSTRAINT "AccountantPermission_accountantAccessId_fkey" FOREIGN KEY ("accountantAccessId") REFERENCES "AccountantAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountingLedgerAdjustment" (
    "id" TEXT NOT NULL,
    "ledgerType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioProjectId" TEXT,
    "studioClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingLedgerAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountingLedgerAdjustment_transactionDate_idx" ON "AccountingLedgerAdjustment"("transactionDate");
CREATE INDEX "AccountingLedgerAdjustment_studioProjectId_idx" ON "AccountingLedgerAdjustment"("studioProjectId");
CREATE INDEX "AccountingLedgerAdjustment_studioClientId_idx" ON "AccountingLedgerAdjustment"("studioClientId");
CREATE INDEX "AccountingLedgerAdjustment_ledgerType_idx" ON "AccountingLedgerAdjustment"("ledgerType");

ALTER TABLE "AccountingLedgerAdjustment" ADD CONSTRAINT "AccountingLedgerAdjustment_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountingLedgerAdjustment" ADD CONSTRAINT "AccountingLedgerAdjustment_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountingNote" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorType" "AccountingNoteAuthorType" NOT NULL,
    "accountantAccessId" TEXT,
    "isOwnerActor" BOOLEAN NOT NULL DEFAULT false,
    "studioInvoiceId" TEXT,
    "studioExpenseId" TEXT,
    "studioPaymentId" TEXT,
    "studioProjectId" TEXT,
    "studioClientId" TEXT,
    "ledgerAdjustmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountingNote_studioInvoiceId_idx" ON "AccountingNote"("studioInvoiceId");
CREATE INDEX "AccountingNote_studioExpenseId_idx" ON "AccountingNote"("studioExpenseId");
CREATE INDEX "AccountingNote_studioPaymentId_idx" ON "AccountingNote"("studioPaymentId");
CREATE INDEX "AccountingNote_studioProjectId_idx" ON "AccountingNote"("studioProjectId");
CREATE INDEX "AccountingNote_studioClientId_idx" ON "AccountingNote"("studioClientId");
CREATE INDEX "AccountingNote_createdAt_idx" ON "AccountingNote"("createdAt");

ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_accountantAccessId_fkey" FOREIGN KEY ("accountantAccessId") REFERENCES "AccountantAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_studioInvoiceId_fkey" FOREIGN KEY ("studioInvoiceId") REFERENCES "StudioInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_studioExpenseId_fkey" FOREIGN KEY ("studioExpenseId") REFERENCES "StudioExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_studioPaymentId_fkey" FOREIGN KEY ("studioPaymentId") REFERENCES "StudioPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingNote" ADD CONSTRAINT "AccountingNote_ledgerAdjustmentId_fkey" FOREIGN KEY ("ledgerAdjustmentId") REFERENCES "AccountingLedgerAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountingReceipt" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "studioExpenseId" TEXT,
    "uploadedByAccountantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingReceipt_r2Key_key" ON "AccountingReceipt"("r2Key");
CREATE INDEX "AccountingReceipt_studioExpenseId_idx" ON "AccountingReceipt"("studioExpenseId");
CREATE INDEX "AccountingReceipt_uploadedByAccountantId_idx" ON "AccountingReceipt"("uploadedByAccountantId");
CREATE INDEX "AccountingReceipt_createdAt_idx" ON "AccountingReceipt"("createdAt");

ALTER TABLE "AccountingReceipt" ADD CONSTRAINT "AccountingReceipt_studioExpenseId_fkey" FOREIGN KEY ("studioExpenseId") REFERENCES "StudioExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountingReceipt" ADD CONSTRAINT "AccountingReceipt_uploadedByAccountantId_fkey" FOREIGN KEY ("uploadedByAccountantId") REFERENCES "AccountantAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountingDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "r2Key" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'text/csv',
    "sizeBytes" INTEGER,
    "generatedByAccountantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountingDocument_kind_idx" ON "AccountingDocument"("kind");
CREATE INDEX "AccountingDocument_createdAt_idx" ON "AccountingDocument"("createdAt");

ALTER TABLE "AccountingDocument" ADD CONSTRAINT "AccountingDocument_generatedByAccountantId_fkey" FOREIGN KEY ("generatedByAccountantId") REFERENCES "AccountantAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AccountantAuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorAccountantId" TEXT,
    "actorOwner" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountantAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountantAuditLog_actorAccountantId_createdAt_idx" ON "AccountantAuditLog"("actorAccountantId", "createdAt");
CREATE INDEX "AccountantAuditLog_action_createdAt_idx" ON "AccountantAuditLog"("action", "createdAt");
CREATE INDEX "AccountantAuditLog_entityType_entityId_idx" ON "AccountantAuditLog"("entityType", "entityId");
CREATE INDEX "AccountantAuditLog_createdAt_idx" ON "AccountantAuditLog"("createdAt");

ALTER TABLE "AccountantAuditLog" ADD CONSTRAINT "AccountantAuditLog_actorAccountantId_fkey" FOREIGN KEY ("actorAccountantId") REFERENCES "AccountantAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
