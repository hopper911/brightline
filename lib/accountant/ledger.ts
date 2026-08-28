import type { AccountingLedgerAdjustment, StudioExpense, StudioPayment } from "@prisma/client";
import type { PaymentType, StudioPaymentStatus } from "@prisma/client";

export type LedgerEntryType = "INCOME" | "EXPENSE" | "REFUND" | "ADJUSTMENT" | "TRANSFER";

export type UnifiedLedgerRow = {
  id: string;
  source: "payment" | "expense" | "adjustment";
  transactionDate: Date;
  ledgerType: LedgerEntryType;
  category: string;
  description: string;
  amount: string;
  clientName: string | null;
  projectTitle: string | null;
  invoiceNumber: string | null;
};

function paymentToLedgerType(type: PaymentType, status: StudioPaymentStatus): LedgerEntryType {
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED") return "REFUND";
  return "INCOME";
}

export function paymentToRow(
  p: StudioPayment & {
    project: { title: string; client: string };
    invoice: { invoiceNumber: number } | null;
  }
): UnifiedLedgerRow {
  return {
    id: `pay-${p.id}`,
    source: "payment",
    transactionDate: p.date,
    ledgerType: paymentToLedgerType(p.type, p.recordStatus),
    category: p.type,
    description: p.note ?? p.type,
    amount: p.amount.toString(),
    clientName: p.project.client,
    projectTitle: p.project.title,
    invoiceNumber: p.invoice ? String(p.invoice.invoiceNumber) : null,
  };
}

export function expenseToRow(
  e: StudioExpense & {
    project: { title: string; client: string } | null;
    studioClient: { companyName: string } | null;
  }
): UnifiedLedgerRow {
  const clientName = e.studioClient?.companyName ?? e.project?.client ?? null;
  return {
    id: `exp-${e.id}`,
    source: "expense",
    transactionDate: e.date,
    ledgerType: "EXPENSE",
    category: e.category,
    description: e.title ?? e.vendor ?? e.note ?? e.category,
    amount: e.amount.mul(-1).toString(),
    clientName,
    projectTitle: e.project?.title ?? null,
    invoiceNumber: null,
  };
}

export function adjustmentToRow(
  a: AccountingLedgerAdjustment & {
    studioProject: { title: string; client: string } | null;
    studioClient: { companyName: string } | null;
  }
): UnifiedLedgerRow {
  const clientName = a.studioClient?.companyName ?? a.studioProject?.client ?? null;
  const lt = a.ledgerType.toUpperCase();
  const ledgerType: LedgerEntryType =
    lt === "REFUND"
      ? "REFUND"
      : lt === "TRANSFER"
        ? "TRANSFER"
        : lt === "INCOME"
          ? "INCOME"
          : "ADJUSTMENT";
  return {
    id: `adj-${a.id}`,
    source: "adjustment",
    transactionDate: a.transactionDate,
    ledgerType,
    category: a.category ?? a.ledgerType,
    description: a.description,
    amount: a.amount.toString(),
    clientName,
    projectTitle: a.studioProject?.title ?? null,
    invoiceNumber: null,
  };
}
