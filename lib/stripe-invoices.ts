import { Prisma, type StudioInvoiceStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { STRIPE_NOT_CONFIGURED_MESSAGE } from "@/lib/stripe-env";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error(STRIPE_NOT_CONFIGURED_MESSAGE), { status: 500 });
  }
  return new Stripe(apiKey);
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

export function moneyToCents(value: Prisma.Decimal | number | string) {
  const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
  return Number(decimal.mul(100).toDecimalPlaces(0).toString());
}

export function normalizeCurrency(value: string | null | undefined) {
  return (value?.trim().toLowerCase() || "usd").slice(0, 3);
}

export async function markInvoiceFailed(input: {
  invoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  reason?: string | null;
}) {
  const where = input.invoiceId
    ? { id: input.invoiceId }
    : input.stripePaymentIntentId
      ? { stripePaymentIntentId: input.stripePaymentIntentId }
      : null;
  if (!where) return null;

  const invoice = await prisma.studioInvoice.findFirst({
    where,
    select: { id: true, notes: true, deliveryPackageId: true, status: true },
  });
  if (!invoice) return null;
  if (invoice.status === "PAID") return null;

  const updated = await prisma.studioInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "FAILED" as StudioInvoiceStatus,
      stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      notes: input.reason
        ? [invoice.notes, `Stripe payment failed: ${input.reason}`].filter(Boolean).join("\n")
        : undefined,
    },
  });

  if (invoice.deliveryPackageId) {
    await prisma.packageAccessLog.create({
      data: {
        deliveryPackageId: invoice.deliveryPackageId,
        eventType: "invoice_payment_failed",
      },
    }).catch(() => null);
  }

  return updated;
}

export async function markInvoicePaid(input: {
  invoiceId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCustomerId?: string | null;
  amountPaidCents?: number | null;
  currency?: string | null;
}) {
  const where = input.invoiceId
    ? { id: input.invoiceId }
    : input.stripeCheckoutSessionId
      ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId }
      : input.stripePaymentIntentId
        ? { stripePaymentIntentId: input.stripePaymentIntentId }
        : null;
  if (!where) return null;

  const existing = await prisma.studioInvoice.findFirst({
    where,
    select: { id: true, status: true, balanceRemaining: true },
  });
  if (!existing) return null;
  /** Idempotent: verified webhooks may be delivered more than once. */
  if (existing.status === "PAID" && existing.balanceRemaining.lte(0)) {
    return prisma.studioInvoice.findFirst({
      where: { id: existing.id },
      include: { lineItems: true },
    });
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.studioInvoice.findFirst({
      where,
      include: { lineItems: true },
    });
    if (!invoice) return null;
    if (invoice.status === "PAID" && invoice.balanceRemaining.lte(0)) {
      return invoice;
    }

    const currency = normalizeCurrency(input.currency ?? invoice.currency);
    const amount = input.amountPaidCents != null
      ? new Prisma.Decimal(input.amountPaidCents).div(100).toDecimalPlaces(2)
      : invoice.total;

    if (invoice.projectId) {
      const existingPayment = input.stripePaymentIntentId
        ? await tx.studioPayment.findFirst({
            where: {
              invoiceId: invoice.id,
              note: { contains: input.stripePaymentIntentId },
            },
            select: { id: true },
          })
        : null;
      if (!existingPayment && amount.gt(0)) {
        await tx.studioPayment.create({
          data: {
            projectId: invoice.projectId,
            invoiceId: invoice.id,
            amount,
            type: "OTHER",
            note: input.stripePaymentIntentId
              ? `Stripe payment_intent ${input.stripePaymentIntentId}`
              : "Stripe payment",
          },
        });
      }
      await tx.studioInvoice.update({
        where: { id: invoice.id },
        data: {
          stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? undefined,
          stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
          stripeCustomerId: input.stripeCustomerId ?? undefined,
          currency,
        },
      });
      const recalculated = await recalculateInvoiceFinance(tx, invoice.id);
      if (recalculated.status !== "PAID") {
        return tx.studioInvoice.update({
          where: { id: invoice.id },
          data: {
            status: "PAID",
            amountPaid: recalculated.total,
            balanceRemaining: new Prisma.Decimal(0),
            paidAt: recalculated.paidAt ?? new Date(),
          },
        });
      }
      return recalculated;
    }

    const paidAt = invoice.paidAt ?? new Date();
    const paidInvoice = await tx.studioInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        amountPaid: invoice.total,
        balanceRemaining: new Prisma.Decimal(0),
        paidAt,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? undefined,
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
        stripeCustomerId: input.stripeCustomerId ?? undefined,
        currency,
      },
    });

    return paidInvoice;
  }).then(async (invoice) => {
    if (!invoice?.deliveryPackageId) return invoice;
    await prisma.deliveryPackage.update({
      where: { id: invoice.deliveryPackageId },
      data: { status: "sent", deliveryDate: new Date() },
    }).catch(() => null);
    await prisma.packageAccessLog.create({
      data: {
        deliveryPackageId: invoice.deliveryPackageId,
        eventType: "invoice_paid",
      },
    }).catch(() => null);
    return invoice;
  });
}

