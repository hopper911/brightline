import { PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MonthRange = {
  start: Date;
  end: Date;
  label: string;
};

export function getMonthRange(input?: string | null): MonthRange {
  const now = new Date();
  const raw = input?.trim();
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth = Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex <= 11
    ? monthIndex
    : now.getMonth();
  return {
    start: new Date(safeYear, safeMonth, 1),
    end: new Date(safeYear, safeMonth + 1, 1),
    label: `${safeYear}-${String(safeMonth + 1).padStart(2, "0")}`,
  };
}

export function parseMoney(value: unknown, field = "amount"): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  const raw = typeof value === "string" ? value.trim().replace(/[$,]/g, "") : value;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

export function parsePositiveMoney(value: unknown, field = "amount"): Prisma.Decimal {
  const amount = parseMoney(value, field);
  if (amount.lte(0)) {
    throw new Error(`${field} must be greater than zero.`);
  }
  return amount;
}

export function parseDate(value: unknown, fallback = new Date()): Date {
  if (value == null || value === "") return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be a valid date.");
  }
  return date;
}

export function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizePaymentType(value: unknown): PaymentType {
  if (value === PaymentType.DEPOSIT || value === PaymentType.FINAL || value === PaymentType.OTHER) {
    return value;
  }
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (upper === PaymentType.DEPOSIT || upper === PaymentType.FINAL || upper === PaymentType.OTHER) {
    return upper as PaymentType;
  }
  return PaymentType.OTHER;
}

export function normalizePaymentStatus(value: unknown): PaymentStatus | undefined {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    upper === PaymentStatus.UNPRICED ||
    upper === PaymentStatus.DEPOSIT_DUE ||
    upper === PaymentStatus.PARTIALLY_PAID ||
    upper === PaymentStatus.PAID ||
    upper === PaymentStatus.OVERDUE ||
    upper === PaymentStatus.WRITE_OFF
  ) {
    return upper as PaymentStatus;
  }
  return undefined;
}

export function computePaymentStatus(input: {
  totalPrice: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  balanceRemaining: Prisma.Decimal;
  explicitStatus?: PaymentStatus;
}): PaymentStatus {
  if (input.explicitStatus) {
    return input.explicitStatus;
  }
  if (input.totalPrice.lte(0)) return PaymentStatus.UNPRICED;
  if (input.balanceRemaining.lte(0)) return PaymentStatus.PAID;
  if (input.amountPaid.lte(0)) return PaymentStatus.DEPOSIT_DUE;
  return PaymentStatus.PARTIALLY_PAID;
}

export async function recalculateProjectFinance(
  tx: Prisma.TransactionClient,
  projectId: string,
  explicitStatus?: PaymentStatus
) {
  const project = await tx.studioProject.findUnique({
    where: { id: projectId },
    select: { id: true, totalPrice: true },
  });
  if (!project) {
    throw new Error("Project not found.");
  }

  const totals = await tx.studioPayment.aggregate({
    where: { projectId },
    _sum: { amount: true },
  });

  const amountPaid = totals._sum.amount ?? new Prisma.Decimal(0);
  const rawBalance = project.totalPrice.minus(amountPaid);
  const balanceRemaining = rawBalance.gt(0) ? rawBalance : new Prisma.Decimal(0);
  const paymentStatus = computePaymentStatus({
    totalPrice: project.totalPrice,
    amountPaid,
    balanceRemaining,
    explicitStatus,
  });

  return tx.studioProject.update({
    where: { id: projectId },
    data: { amountPaid, balanceRemaining, paymentStatus },
  });
}

export async function getFinanceOverview(monthParam?: string | null) {
  const month = getMonthRange(monthParam);
  const monthWhere = { date: { gte: month.start, lt: month.end } };

  const [payments, expenses, revenueAgg, expenseAgg, outstandingProjects, projects] =
    await Promise.all([
      prisma.studioPayment.findMany({
        where: monthWhere,
        orderBy: { date: "desc" },
        include: { project: { select: { id: true, title: true, client: true, slug: true } } },
        take: 200,
      }),
      prisma.studioExpense.findMany({
        where: monthWhere,
        orderBy: { date: "desc" },
        include: { project: { select: { id: true, title: true, client: true, slug: true } } },
        take: 200,
      }),
      prisma.studioPayment.aggregate({ where: monthWhere, _sum: { amount: true } }),
      prisma.studioExpense.aggregate({ where: monthWhere, _sum: { amount: true } }),
      prisma.studioProject.findMany({
        where: { balanceRemaining: { gt: 0 } },
        orderBy: [{ paymentStatus: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          client: true,
          clientId: true,
          totalPrice: true,
          amountPaid: true,
          balanceRemaining: true,
          paymentStatus: true,
          status: true,
          updatedAt: true,
        },
        take: 100,
      }),
      prisma.studioProject.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          client: true,
          clientId: true,
          slug: true,
          totalPrice: true,
          depositAmount: true,
          amountPaid: true,
          balanceRemaining: true,
          paymentStatus: true,
          contentStatus: true,
          captionDrafted: true,
          websiteCopyDrafted: true,
          contentPosted: true,
          reusableLater: true,
          status: true,
          updatedAt: true,
        },
        take: 300,
      }),
    ]);

  const revenueThisMonth = revenueAgg._sum.amount ?? new Prisma.Decimal(0);
  const expensesThisMonth = expenseAgg._sum.amount ?? new Prisma.Decimal(0);

  return {
    month,
    summary: {
      revenueThisMonth,
      expensesThisMonth,
      estimatedProfit: revenueThisMonth.minus(expensesThisMonth),
      outstandingBalance: outstandingProjects.reduce(
        (sum, project) => sum.plus(project.balanceRemaining),
        new Prisma.Decimal(0)
      ),
    },
    payments,
    expenses,
    outstandingProjects,
    projects,
  };
}
