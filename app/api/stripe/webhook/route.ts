import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { assertStripeWebhookEnv } from "@/lib/stripe-env";
import { getStripe, markInvoiceFailed, markInvoicePaid, moneyToCents, normalizeCurrency } from "@/lib/stripe-invoices";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(req: Request) {
  let rawBody: string;
  try {
    assertStripeWebhookEnv();
    rawBody = await req.text();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe webhook misconfigured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid Stripe webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") break;

      const invoiceId = session.metadata?.invoiceId?.trim();
      if (!invoiceId) break;

      const verified = await prisma.$transaction(async (tx) => {
        await recalculateInvoiceFinance(tx, invoiceId);
        const inv = await tx.studioInvoice.findUnique({
          where: { id: invoiceId },
          select: {
            id: true,
            balanceRemaining: true,
            currency: true,
            status: true,
          },
        });
        if (!inv) return { ok: false as const, reason: "missing" };
        if (inv.status === "PAID" && inv.balanceRemaining.lte(0)) {
          return { ok: true as const, alreadyPaid: true };
        }
        if (session.amount_total == null) {
          return { ok: false as const, reason: "no_amount" };
        }
        const expectedCents = moneyToCents(inv.balanceRemaining);
        if (session.amount_total !== expectedCents) {
          return { ok: false as const, reason: "amount_mismatch", expectedCents, got: session.amount_total };
        }
        if (normalizeCurrency(session.currency) !== normalizeCurrency(inv.currency)) {
          return { ok: false as const, reason: "currency_mismatch" };
        }
        return { ok: true as const, alreadyPaid: false };
      });

      if (!verified.ok) {
        if (verified.reason === "amount_mismatch") {
          console.error("[stripe webhook] checkout amount mismatch", {
            invoiceId,
            expectedCents: verified.expectedCents,
            amount_total: verified.got,
          });
        }
        break;
      }
      if (verified.alreadyPaid) break;

      await markInvoicePaid({
        invoiceId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: stringId(session.payment_intent),
        stripeCustomerId: stringId(session.customer),
        amountPaidCents: session.amount_total,
        currency: session.currency,
      });
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await markInvoiceFailed({
        invoiceId: intent.metadata?.invoiceId?.trim() ?? undefined,
        stripePaymentIntentId: intent.id,
        reason: intent.last_payment_error?.message ?? "Stripe reported payment failure.",
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = stringId(charge.payment_intent);
      if (!paymentIntentId) break;
      const invoice = await prisma.studioInvoice.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true, total: true, deliveryPackageId: true },
      });
      if (!invoice) break;

      const refunded = new Prisma.Decimal(charge.amount_refunded ?? 0).div(100).toDecimalPlaces(2);
      const captured = new Prisma.Decimal(charge.amount_captured ?? charge.amount ?? 0).div(100).toDecimalPlaces(2);
      const nextPaid = Prisma.Decimal.max(new Prisma.Decimal(0), captured.minus(refunded));
      const nextBalance = Prisma.Decimal.max(new Prisma.Decimal(0), invoice.total.minus(nextPaid));
      await prisma.studioInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: nextPaid,
          balanceRemaining: nextBalance,
          status: nextPaid.lte(0)
            ? "SENT"
            : nextBalance.gt(0)
              ? "PARTIALLY_PAID"
              : "PAID",
          paidAt: nextBalance.gt(0) ? null : undefined,
        },
      });
      if (invoice.deliveryPackageId) {
        await prisma.packageAccessLog
          .create({
            data: {
              deliveryPackageId: invoice.deliveryPackageId,
              eventType: nextPaid.lte(0) ? "invoice_refunded" : "invoice_partially_refunded",
            },
          })
          .catch(() => null);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
