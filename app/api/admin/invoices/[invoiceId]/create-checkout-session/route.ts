import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { assertStripeSecretKey, getCheckoutSiteBaseUrl } from "@/lib/stripe-env";
import { getStripe, moneyToCents, normalizeCurrency } from "@/lib/stripe-invoices";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_CHECKOUT_CONFIG_ERROR =
  "Stripe checkout is not configured. Check STRIPE_SECRET_KEY and NEXT_PUBLIC_SITE_URL.";

export async function POST(
  req: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let baseUrl: string;
  try {
    assertStripeSecretKey();
    baseUrl = getCheckoutSiteBaseUrl();
  } catch (e) {
    const message = e instanceof Error ? e.message : STRIPE_CHECKOUT_CONFIG_ERROR;
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { invoiceId } = await context.params;
  const stripe = getStripe();

  const invoice = await prisma.$transaction(async (tx) => {
    await recalculateInvoiceFinance(tx, invoiceId);
    return tx.studioInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        project: { select: { id: true, title: true } },
        deliveryPackage: { select: { id: true, accessToken: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status === "PAID" || invoice.balanceRemaining.lte(0)) {
    return NextResponse.json({ error: "Invoice is already paid." }, { status: 400 });
  }

  const currency = normalizeCurrency(invoice.currency);
  const amountCents = moneyToCents(invoice.balanceRemaining);
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nothing to charge; balance is zero." }, { status: 400 });
  }

  const packageUrl = invoice.deliveryPackage?.accessToken
    ? `${baseUrl}/package/${invoice.deliveryPackage.accessToken}`
    : null;
  const successUrl = packageUrl ? `${packageUrl}?payment=success` : `${baseUrl}/?payment=success`;
  const cancelUrl = packageUrl ? `${packageUrl}?payment=cancelled` : `${baseUrl}/?payment=cancelled`;

  const customerId =
    invoice.stripeCustomerId ??
    (
      await stripe.customers.create({
        name: invoice.client.companyName,
        email: invoice.client.email || undefined,
        metadata: {
          studioClientId: invoice.clientId,
          invoiceId: invoice.id,
        },
      })
    ).id;

  const lineSummary =
    invoice.lineItems.length > 0
      ? invoice.lineItems
          .map((line) => `${line.name} (${line.amount.toString()} ${currency.toUpperCase()})`)
          .join("; ")
          .slice(0, 400)
      : "";

  const lineItems = [
    {
      quantity: 1,
      price_data: {
        currency,
        /** Authoritative amount owed — includes tax/discount rollup from DB (not re-derived from client input). */
        unit_amount: amountCents,
        product_data: {
          name: `Invoice #${invoice.invoiceNumber} — Balance due`,
          description: [
            `Subtotal ${invoice.subtotal.toString()} · Tax ${invoice.tax.toString()} · Discount ${invoice.discount.toString()}`,
            lineSummary ? `Lines: ${lineSummary}` : "",
          ]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 450),
        },
      },
    },
  ];

  const deliveryPackageId = invoice.deliveryPackageId ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    invoice_creation: { enabled: true },
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: String(invoice.invoiceNumber),
      deliveryPackageId,
    },
    payment_intent_data: {
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: String(invoice.invoiceNumber),
        deliveryPackageId,
      },
    },
  });

  const updated = await prisma.studioInvoice.update({
    where: { id: invoice.id },
    data: {
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      sentAt: invoice.sentAt ?? new Date(),
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: customerId,
      paymentUrl: session.url,
      currency,
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" }, include: { mediaLinks: true } },
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    paymentUrl: session.url,
    checkoutSessionId: session.id,
    invoice: updated,
  });
}
