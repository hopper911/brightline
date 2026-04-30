import { Prisma, ProjectStatus, type StudioInvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMoney, parsePositiveMoney } from "@/lib/studio/finance";

export function normalizeStudioInvoiceStatus(value: unknown): StudioInvoiceStatus | undefined {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  const allowed: StudioInvoiceStatus[] = [
    "DRAFT",
    "SENT",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
    "VOID",
  ];
  if (allowed.includes(upper as StudioInvoiceStatus)) {
    return upper as StudioInvoiceStatus;
  }
  return undefined;
}

export const SERVICE_TEMPLATE_SLUGS = {
  retouchedImages: "retouched-images",
  creativeFee: "creative-fee",
  photographyCreative: "photography-creative-services",
  travel: "travel",
  cancellation: "cancellation-fee",
} as const;

const SHOT_OR_LATER: ProjectStatus[] = [
  ProjectStatus.SHOT,
  ProjectStatus.INGESTING,
  ProjectStatus.EDITING,
  ProjectStatus.PROOF_READY,
  ProjectStatus.CLIENT_REVIEWING,
  ProjectStatus.FINAL_APPROVED,
  ProjectStatus.DELIVERED,
  ProjectStatus.CASE_STUDY_DRAFT,
  ProjectStatus.PUBLISHED,
  ProjectStatus.ARCHIVED,
];

export function isShootBillingContext(project: {
  shootDate: Date | null;
  status: ProjectStatus;
}): boolean {
  if (project.shootDate != null) return true;
  return SHOT_OR_LATER.includes(project.status);
}

export function roundMoney(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toFixed(2));
}

export function lineAmount(unitPrice: Prisma.Decimal, quantity: Prisma.Decimal): Prisma.Decimal {
  return roundMoney(unitPrice.mul(quantity));
}

export function invoiceTotalFromParts(input: {
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  discount: Prisma.Decimal;
}): Prisma.Decimal {
  const raw = input.subtotal.plus(input.tax).minus(input.discount);
  return raw.gt(0) ? roundMoney(raw) : new Prisma.Decimal(0);
}

export function computeInvoiceStatus(input: {
  explicitStatus?: StudioInvoiceStatus;
  total: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  balanceRemaining: Prisma.Decimal;
  dueAt: Date | null;
  sentAt: Date | null;
  now?: Date;
}): StudioInvoiceStatus {
  if (input.explicitStatus) {
    return input.explicitStatus;
  }
  const now = input.now ?? new Date();
  if (input.total.lte(0) && input.amountPaid.lte(0)) {
    return "DRAFT";
  }
  if (input.balanceRemaining.lte(0)) {
    return "PAID";
  }
  const due = input.dueAt;
  if (due && due < now && input.balanceRemaining.gt(0)) {
    return "OVERDUE";
  }
  if (input.amountPaid.gt(0)) {
    return "PARTIALLY_PAID";
  }
  if (input.sentAt) {
    return "SENT";
  }
  return "DRAFT";
}

export async function getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<number> {
  const last = await tx.studioInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  return (last?.invoiceNumber ?? 0) + 1;
}

/** Recompute line `amount` from unitPrice * quantity for every line, then invoice subtotal/total and payment rollup. */
export async function recalculateInvoiceFinance(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  explicitStatus?: StudioInvoiceStatus
) {
  const invoice = await tx.studioInvoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const preserveVoid = invoice.status === "VOID" && explicitStatus !== "VOID";

  let subtotal = new Prisma.Decimal(0);
  for (const line of invoice.lineItems) {
    const amount = lineAmount(line.unitPrice, line.quantity);
    subtotal = subtotal.plus(amount);
    if (!amount.equals(line.amount)) {
      await tx.studioInvoiceLineItem.update({
        where: { id: line.id },
        data: { amount },
      });
    }
  }

  subtotal = roundMoney(subtotal);
  const total = invoiceTotalFromParts({
    subtotal,
    tax: invoice.tax,
    discount: invoice.discount,
  });

  const paidAgg = await tx.studioPayment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const amountPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
  const rawBal = total.minus(amountPaid);
  const balanceRemaining = rawBal.gt(0) ? roundMoney(rawBal) : new Prisma.Decimal(0);

  const status: StudioInvoiceStatus = preserveVoid
    ? "VOID"
    : computeInvoiceStatus({
        explicitStatus: explicitStatus ?? undefined,
        total,
        amountPaid,
        balanceRemaining,
        dueAt: invoice.dueAt,
        sentAt: invoice.sentAt,
      });

  const paidAt =
    balanceRemaining.lte(0) && amountPaid.gt(0) ? (invoice.paidAt ?? new Date()) : null;

  return tx.studioInvoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      total,
      amountPaid,
      balanceRemaining,
      status,
      paidAt,
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" }, include: { mediaLinks: true } },
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, title: true, slug: true } },
    },
  });
}

export async function generateInvoiceFromProject(projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.studioProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        clientId: true,
        status: true,
        shootDate: true,
        totalImages: true,
        travelTimeHours: true,
        isCancelled: true,
      },
    });
    if (!project) {
      throw new Error("Project not found.");
    }
    if (!project.clientId) {
      throw new Error("Project has no client; link a Studio client before invoicing.");
    }

    const slugs = Object.values(SERVICE_TEMPLATE_SLUGS);
    const templates = await tx.studioServiceTemplate.findMany({
      where: { slug: { in: slugs }, isActive: true },
    });
    const bySlug = new Map(templates.map((t) => [t.slug, t]));

    const nextNo = await getNextInvoiceNumber(tx);

    const invoice = await tx.studioInvoice.create({
      data: {
        invoiceNumber: nextNo,
        clientId: project.clientId,
        projectId: project.id,
        status: "DRAFT",
        notes: `Auto-generated from project: ${project.title}`,
      },
    });

    type LineSpec = {
      templateSlug: string;
      quantity: Prisma.Decimal;
      unitPriceOverride?: Prisma.Decimal;
    };

    const lines: LineSpec[] = [];

    if (project.isCancelled) {
      const t = bySlug.get(SERVICE_TEMPLATE_SLUGS.cancellation);
      if (!t) throw new Error("Cancellation template missing; run seed.");
      lines.push({
        templateSlug: SERVICE_TEMPLATE_SLUGS.cancellation,
        quantity: new Prisma.Decimal(1),
      });
    } else {
      if (project.totalImages != null && project.totalImages > 0) {
        const t = bySlug.get(SERVICE_TEMPLATE_SLUGS.retouchedImages);
        if (!t) throw new Error("Retouched Images template missing; run seed.");
        lines.push({
          templateSlug: SERVICE_TEMPLATE_SLUGS.retouchedImages,
          quantity: new Prisma.Decimal(project.totalImages),
        });
      }
      if (project.travelTimeHours != null && project.travelTimeHours.gt(0)) {
        const t = bySlug.get(SERVICE_TEMPLATE_SLUGS.travel);
        if (!t) throw new Error("Travel template missing; run seed.");
        lines.push({
          templateSlug: SERVICE_TEMPLATE_SLUGS.travel,
          quantity: new Prisma.Decimal(project.travelTimeHours.toString()),
        });
      }
      if (isShootBillingContext(project)) {
        const t = bySlug.get(SERVICE_TEMPLATE_SLUGS.creativeFee);
        if (!t) throw new Error("Creative Fee template missing; run seed.");
        lines.push({
          templateSlug: SERVICE_TEMPLATE_SLUGS.creativeFee,
          quantity: new Prisma.Decimal(1),
        });
      }
    }

    let sort = 0;
    for (const spec of lines) {
      const template = bySlug.get(spec.templateSlug);
      if (!template) continue;
      const unitPrice = spec.unitPriceOverride ?? template.defaultPrice;
      const quantity = spec.quantity;
      const amount = lineAmount(unitPrice, quantity);
      await tx.studioInvoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          serviceTemplateId: template.id,
          name: template.name,
          type: template.type,
          unitLabel: template.unitLabel,
          unitPrice,
          quantity,
          amount,
          sortOrder: sort++,
        },
      });
    }

    return recalculateInvoiceFinance(tx, invoice.id);
  });
}

export function assertSingleMediaTarget(input: {
  studioMediaId?: string | null;
  galleryImageId?: string | null;
}) {
  const a = input.studioMediaId?.trim() || null;
  const b = input.galleryImageId?.trim() || null;
  if ((a ? 1 : 0) + (b ? 1 : 0) !== 1) {
    throw new Error("Provide exactly one of studioMediaId or galleryImageId.");
  }
}

export async function attachMediaToLineItem(input: {
  lineItemId: string;
  studioMediaId?: string | null;
  galleryImageId?: string | null;
  quantity?: unknown;
}) {
  assertSingleMediaTarget(input);
  const quantity = input.quantity == null ? new Prisma.Decimal(1) : parsePositiveMoney(input.quantity, "quantity");

  const line = await prisma.studioInvoiceLineItem.findUnique({
    where: { id: input.lineItemId },
    select: { id: true, type: true, invoiceId: true },
  });
  if (!line) {
    throw new Error("Line item not found.");
  }
  if (line.type !== "PER_IMAGE") {
    throw new Error("Only PER_IMAGE line items support media attribution.");
  }

  return prisma.studioInvoiceLineItemMedia.create({
    data: {
      lineItemId: line.id,
      studioMediaId: input.studioMediaId?.trim() || null,
      galleryImageId: input.galleryImageId?.trim() || null,
      quantity,
    },
  });
}

/** Dashboard + analytics helpers */
export async function getFinanceEngineAnalytics() {
  const [
    paymentTotal,
    invoiceBilledAgg,
    clientsFromPayments,
    perImageLines,
    invoicesForAvg,
    outstanding,
    overdue,
  ] = await Promise.all([
    prisma.studioPayment.aggregate({ _sum: { amount: true } }),
    prisma.studioInvoice.groupBy({
      by: ["clientId"],
      where: { status: { not: "VOID" } },
      _sum: { total: true },
    }),
    prisma.studioPayment.findMany({
      select: {
        amount: true,
        project: { select: { clientId: true, client: true } },
      },
    }),
    prisma.studioInvoiceLineItem.findMany({
      where: { type: "PER_IMAGE" },
      select: { quantity: true, amount: true },
    }),
    prisma.studioInvoice.findMany({
      where: { status: { notIn: ["VOID", "DRAFT"] } },
      select: { total: true },
    }),
    prisma.studioInvoice.aggregate({
      where: { status: { notIn: ["VOID", "PAID"] }, balanceRemaining: { gt: 0 } },
      _sum: { balanceRemaining: true },
    }),
    prisma.studioInvoice.findMany({
      where: {
        status: { notIn: ["VOID", "PAID", "DRAFT"] },
        balanceRemaining: { gt: 0 },
        dueAt: { lt: new Date() },
      },
      select: { id: true, invoiceNumber: true, balanceRemaining: true, dueAt: true, clientId: true },
      take: 200,
    }),
  ]);

  const totalRevenue = paymentTotal._sum.amount ?? new Prisma.Decimal(0);

  const billedByClientId = new Map<string, Prisma.Decimal>();
  for (const row of invoiceBilledAgg) {
    billedByClientId.set(row.clientId, row._sum.total ?? new Prisma.Decimal(0));
  }

  const revenuePerClient = new Map<string, Prisma.Decimal>();
  for (const p of clientsFromPayments) {
    const cid = p.project.clientId;
    if (!cid) continue;
    const prev = revenuePerClient.get(cid) ?? new Prisma.Decimal(0);
    revenuePerClient.set(cid, prev.plus(p.amount));
  }

  let billedImagesQty = new Prisma.Decimal(0);
  let perImageRevenue = new Prisma.Decimal(0);
  for (const row of perImageLines) {
    billedImagesQty = billedImagesQty.plus(row.quantity);
    perImageRevenue = perImageRevenue.plus(row.amount);
  }
  const revenuePerImage = billedImagesQty.gt(0)
    ? roundMoney(perImageRevenue.div(billedImagesQty))
    : new Prisma.Decimal(0);

  let avgInvoice = new Prisma.Decimal(0);
  if (invoicesForAvg.length > 0) {
    const sum = invoicesForAvg.reduce((s, i) => s.plus(i.total), new Prisma.Decimal(0));
    avgInvoice = roundMoney(sum.div(invoicesForAvg.length));
  }

  let topClient: { clientId: string; revenue: Prisma.Decimal } | null = null;
  for (const [clientId, revenue] of revenuePerClient) {
    if (!topClient || revenue.gt(topClient.revenue)) {
      topClient = { clientId, revenue };
    }
  }

  let topClientName: string | null = null;
  if (topClient) {
    const c = await prisma.studioClient.findUnique({
      where: { id: topClient.clientId },
      select: { companyName: true },
    });
    topClientName = c?.companyName ?? null;
  }

  return {
    totalRevenue,
    billedByClient: Object.fromEntries([...billedByClientId.entries()].map(([k, v]) => [k, v.toString()])),
    revenuePerClient: Object.fromEntries([...revenuePerClient.entries()].map(([k, v]) => [k, v.toString()])),
    averageInvoiceValue: avgInvoice,
    revenuePerImage,
    billedImagesQty,
    topClientId: topClient?.clientId ?? null,
    topClientRevenue: topClient?.revenue ?? new Prisma.Decimal(0),
    topClientName,
    outstandingBalance: outstanding._sum.balanceRemaining ?? new Prisma.Decimal(0),
    overdueInvoices: overdue,
    overdueCount: overdue.length,
  };
}

export async function getClientFinancials(clientId: string) {
  const [invoices, invoiceTotals, paymentsSum] = await Promise.all([
    prisma.studioInvoice.findMany({
      where: { clientId },
      orderBy: [{ invoiceNumber: "desc" }],
      include: {
        project: { select: { id: true, title: true, slug: true } },
      },
      take: 100,
    }),
    prisma.studioInvoice.aggregate({
      where: { clientId, status: { not: "VOID" } },
      _sum: { total: true, amountPaid: true, balanceRemaining: true },
    }),
    prisma.studioPayment.aggregate({
      where: { project: { clientId } },
      _sum: { amount: true },
    }),
  ]);

  const totalBilled = invoiceTotals._sum.total ?? new Prisma.Decimal(0);
  const totalPaidOnInvoices = invoiceTotals._sum.amountPaid ?? new Prisma.Decimal(0);
  const totalPaidProjects = paymentsSum._sum.amount ?? new Prisma.Decimal(0);
  const lifetimeValue = totalPaidProjects;

  return {
    totalBilled,
    totalPaid: totalPaidOnInvoices,
    totalPaidAllSources: totalPaidProjects,
    lifetimeValue,
    outstandingOnInvoices: invoiceTotals._sum.balanceRemaining ?? new Prisma.Decimal(0),
    invoices,
  };
}
