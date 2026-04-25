-- Studio OS mission control: finance, client memory, content pipeline

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPRICED', 'DEPOSIT_DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientFollowUpStatus" AS ENUM ('NONE', 'NEEDED', 'SCHEDULED', 'DONE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('NONE', 'CAPTION_DRAFTED', 'WEBSITE_COPY_DRAFTED', 'READY_TO_POST', 'POSTED', 'REUSABLE');

-- AlterTable
ALTER TABLE "StudioClient" ADD COLUMN     "followUpAt" TIMESTAMP(3),
ADD COLUMN     "followUpStatus" "ClientFollowUpStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balanceRemaining" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "captionDrafted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentPosted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentStatus" "ContentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPRICED',
ADD COLUMN     "reusableLater" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "websiteCopyDrafted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StudioPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PaymentType" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioExpense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptPath" TEXT,
    "receiptKey" TEXT,
    "receiptFilename" TEXT,
    "receiptContentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioClient_followUpStatus_idx" ON "StudioClient"("followUpStatus");

-- CreateIndex
CREATE INDEX "StudioClient_followUpAt_idx" ON "StudioClient"("followUpAt");

-- CreateIndex
CREATE INDEX "StudioProject_paymentStatus_idx" ON "StudioProject"("paymentStatus");

-- CreateIndex
CREATE INDEX "StudioProject_contentStatus_idx" ON "StudioProject"("contentStatus");

-- CreateIndex
CREATE INDEX "StudioPayment_date_idx" ON "StudioPayment"("date");

-- CreateIndex
CREATE INDEX "StudioPayment_projectId_date_idx" ON "StudioPayment"("projectId", "date");

-- CreateIndex
CREATE INDEX "StudioPayment_type_idx" ON "StudioPayment"("type");

-- CreateIndex
CREATE INDEX "StudioExpense_date_idx" ON "StudioExpense"("date");

-- CreateIndex
CREATE INDEX "StudioExpense_projectId_date_idx" ON "StudioExpense"("projectId", "date");

-- CreateIndex
CREATE INDEX "StudioExpense_category_idx" ON "StudioExpense"("category");

-- AddForeignKey
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioExpense" ADD CONSTRAINT "StudioExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
