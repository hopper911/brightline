-- Stripe Checkout integration for Studio OS invoices.
ALTER TYPE "StudioInvoiceStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TABLE "StudioInvoice" ADD COLUMN "stripeCheckoutSessionId" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "paymentUrl" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd';

CREATE INDEX "StudioInvoice_stripeCheckoutSessionId_idx" ON "StudioInvoice"("stripeCheckoutSessionId");
CREATE INDEX "StudioInvoice_stripePaymentIntentId_idx" ON "StudioInvoice"("stripePaymentIntentId");
CREATE INDEX "StudioInvoice_stripeCustomerId_idx" ON "StudioInvoice"("stripeCustomerId");
