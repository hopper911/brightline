import type { PrismaClient } from "@prisma/client";
import { adjustmentToRow, expenseToRow, paymentToRow, type UnifiedLedgerRow } from "@/lib/accountant/ledger";

export type LedgerDateFilter = { from?: Date | null; to?: Date | null };

function paymentWhere(d: LedgerDateFilter) {
  if (!d.from && !d.to) return {};
  return {
    date: {
      ...(d.from ? { gte: d.from } : {}),
      ...(d.to ? { lte: d.to } : {}),
    },
  };
}

function expenseWhere(d: LedgerDateFilter) {
  if (!d.from && !d.to) return {};
  return {
    date: {
      ...(d.from ? { gte: d.from } : {}),
      ...(d.to ? { lte: d.to } : {}),
    },
  };
}

function adjustmentWhere(d: LedgerDateFilter) {
  if (!d.from && !d.to) return {};
  return {
    transactionDate: {
      ...(d.from ? { gte: d.from } : {}),
      ...(d.to ? { lte: d.to } : {}),
    },
  };
}

export async function loadUnifiedLedger(prisma: PrismaClient, d: LedgerDateFilter): Promise<UnifiedLedgerRow[]> {
  const [payments, expenses, adjustments] = await Promise.all([
    prisma.studioPayment.findMany({
      where: paymentWhere(d),
      include: {
        project: { select: { title: true, client: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    prisma.studioExpense.findMany({
      where: expenseWhere(d),
      include: {
        project: { select: { title: true, client: true } },
        studioClient: { select: { companyName: true } },
      },
    }),
    prisma.accountingLedgerAdjustment.findMany({
      where: adjustmentWhere(d),
      include: {
        project: { select: { title: true, client: true } },
        client: { select: { companyName: true } },
      },
    }),
  ]);

  const rows: UnifiedLedgerRow[] = [
    ...payments.map(paymentToRow),
    ...expenses.map(expenseToRow),
    ...adjustments.map(adjustmentToRow),
  ];
  rows.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  return rows;
}
