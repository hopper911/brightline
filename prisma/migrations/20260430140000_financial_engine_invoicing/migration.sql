-- Brightline financial engine: service templates, invoices, line items, media billing

-- CreateEnum
CREATE TYPE "ServiceTemplateType" AS ENUM ('PER_IMAGE', 'FLAT', 'HOURLY', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "StudioInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN     "totalImages" INTEGER,
ADD COLUMN     "travelTimeHours" DECIMAL(10,2),
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudioPayment" ADD COLUMN     "invoiceId" TEXT;

-- CreateTable
CREATE TABLE "StudioServiceTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceTemplateType" NOT NULL,
    "defaultPrice" DECIMAL(10,2) NOT NULL,
    "maxPrice" DECIMAL(10,2),
    "unitLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioServiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" "StudioInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceRemaining" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "type" "ServiceTemplateType" NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioInvoiceLineItemMedia" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "studioMediaId" TEXT,
    "galleryImageId" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,

    CONSTRAINT "StudioInvoiceLineItemMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioServiceTemplate_slug_key" ON "StudioServiceTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StudioInvoice_invoiceNumber_key" ON "StudioInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "StudioInvoice_clientId_idx" ON "StudioInvoice"("clientId");

-- CreateIndex
CREATE INDEX "StudioInvoice_projectId_idx" ON "StudioInvoice"("projectId");

-- CreateIndex
CREATE INDEX "StudioInvoice_status_idx" ON "StudioInvoice"("status");

-- CreateIndex
CREATE INDEX "StudioInvoice_issuedAt_idx" ON "StudioInvoice"("issuedAt");

-- CreateIndex
CREATE INDEX "StudioInvoice_dueAt_idx" ON "StudioInvoice"("dueAt");

-- CreateIndex
CREATE INDEX "StudioInvoiceLineItem_invoiceId_sortOrder_idx" ON "StudioInvoiceLineItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "StudioInvoiceLineItemMedia_studioMediaId_idx" ON "StudioInvoiceLineItemMedia"("studioMediaId");

-- CreateIndex
CREATE INDEX "StudioInvoiceLineItemMedia_galleryImageId_idx" ON "StudioInvoiceLineItemMedia"("galleryImageId");

-- CreateIndex
CREATE INDEX "StudioPayment_invoiceId_idx" ON "StudioPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioInvoiceLineItemMedia_lineItemId_studioMediaId_key" ON "StudioInvoiceLineItemMedia"("lineItemId", "studioMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioInvoiceLineItemMedia_lineItemId_galleryImageId_key" ON "StudioInvoiceLineItemMedia"("lineItemId", "galleryImageId");

-- AddForeignKey
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "StudioInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "StudioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoiceLineItem" ADD CONSTRAINT "StudioInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "StudioInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoiceLineItem" ADD CONSTRAINT "StudioInvoiceLineItem_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "StudioServiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoiceLineItemMedia" ADD CONSTRAINT "StudioInvoiceLineItemMedia_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "StudioInvoiceLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoiceLineItemMedia" ADD CONSTRAINT "StudioInvoiceLineItemMedia_studioMediaId_fkey" FOREIGN KEY ("studioMediaId") REFERENCES "StudioMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoiceLineItemMedia" ADD CONSTRAINT "StudioInvoiceLineItemMedia_galleryImageId_fkey" FOREIGN KEY ("galleryImageId") REFERENCES "GalleryImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
