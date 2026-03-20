/**
 * Bright Line Studio OS – finance store (SQLite)
 *
 * Track invoices, expenses, payments. Read/track only.
 * No bank connection, no auto-send.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type Invoice = {
  id: string;
  projectId: string | null;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  dueDate: string | null;
};

export type Expense = {
  id: string;
  projectId: string | null;
  category: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  projectId: string | null;
  amount: number;
  date: string;
  createdAt: string;
};

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createInvoice(input: {
  projectId?: string | null;
  amount?: number;
  status?: InvoiceStatus;
  dueDate?: string | null;
  workspaceId?: string;
}): Invoice {
  const id = nextId("inv");
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  db.prepare(
    "INSERT INTO invoices (id, workspace_id, project_id, amount, status, created_at, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    wsId,
    input.projectId ?? null,
    input.amount ?? 0,
    input.status ?? "draft",
    now,
    input.dueDate ?? null
  );
  const row = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, status, created_at AS createdAt, due_date AS dueDate FROM invoices WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Record<string, unknown>;
  return row as unknown as Invoice;
}

export function listInvoices(limit = 100): Invoice[] {
  return listInvoicesForWorkspace(undefined, limit);
}

export function listInvoicesForWorkspace(workspaceId: string | undefined, limit = 100): Invoice[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, status, created_at AS createdAt, due_date AS dueDate FROM invoices WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(wsId, limit) as Record<string, unknown>[];
  return rows as unknown as Invoice[];
}

export function getInvoicesByProject(projectId: string): Invoice[] {
  return getInvoicesByProjectForWorkspace(undefined, projectId);
}

export function getInvoicesByProjectForWorkspace(workspaceId: string | undefined, projectId: string): Invoice[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, status, created_at AS createdAt, due_date AS dueDate FROM invoices WHERE workspace_id = ? AND project_id = ? ORDER BY created_at DESC"
    )
    .all(wsId, projectId) as Record<string, unknown>[];
  return rows as unknown as Invoice[];
}

export function getOutstandingInvoices(): Invoice[] {
  return getOutstandingInvoicesForWorkspace(undefined);
}

export function getOutstandingInvoicesForWorkspace(workspaceId: string | undefined): Invoice[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, status, created_at AS createdAt, due_date AS dueDate FROM invoices WHERE workspace_id = ? AND status IN ('sent', 'overdue') ORDER BY due_date ASC"
    )
    .all(wsId) as Record<string, unknown>[];
  return rows as unknown as Invoice[];
}

export function createExpense(input: {
  projectId?: string | null;
  category?: string | null;
  amount?: number;
  note?: string | null;
  workspaceId?: string;
}): Expense {
  const id = nextId("exp");
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  db.prepare(
    "INSERT INTO expenses (id, workspace_id, project_id, category, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, wsId, input.projectId ?? null, input.category ?? null, input.amount ?? 0, input.note ?? null, now);
  const row = db
    .prepare(
      "SELECT id, project_id AS projectId, category, amount, note, created_at AS createdAt FROM expenses WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Record<string, unknown>;
  return row as unknown as Expense;
}

export function listExpenses(limit = 200): Expense[] {
  return listExpensesForWorkspace(undefined, limit);
}

export function listExpensesForWorkspace(workspaceId: string | undefined, limit = 200): Expense[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, category, amount, note, created_at AS createdAt FROM expenses WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(wsId, limit) as Record<string, unknown>[];
  return rows as unknown as Expense[];
}

export function getExpensesByProject(projectId: string): Expense[] {
  return getExpensesByProjectForWorkspace(undefined, projectId);
}

export function getExpensesByProjectForWorkspace(workspaceId: string | undefined, projectId: string): Expense[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, category, amount, note, created_at AS createdAt FROM expenses WHERE workspace_id = ? AND project_id = ? ORDER BY created_at DESC"
    )
    .all(wsId, projectId) as Record<string, unknown>[];
  return rows as unknown as Expense[];
}

export function getExpensesByCategory(category: string): Expense[] {
  return getExpensesByCategoryForWorkspace(undefined, category);
}

export function getExpensesByCategoryForWorkspace(workspaceId: string | undefined, category: string): Expense[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, category, amount, note, created_at AS createdAt FROM expenses WHERE workspace_id = ? AND category = ? ORDER BY created_at DESC"
    )
    .all(wsId, category) as Record<string, unknown>[];
  return rows as unknown as Expense[];
}

export function createPayment(input: {
  projectId?: string | null;
  amount: number;
  date: string;
  workspaceId?: string;
}): Payment {
  const id = nextId("pay");
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  db.prepare(
    "INSERT INTO payments (id, workspace_id, project_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, wsId, input.projectId ?? null, input.amount, input.date, now);
  const row = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, date, created_at AS createdAt FROM payments WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Record<string, unknown>;
  return row as unknown as Payment;
}

export function listPayments(limit = 200): Payment[] {
  return listPaymentsForWorkspace(undefined, limit);
}

export function listPaymentsForWorkspace(workspaceId: string | undefined, limit = 200): Payment[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, date, created_at AS createdAt FROM payments WHERE workspace_id = ? ORDER BY date DESC LIMIT ?"
    )
    .all(wsId, limit) as Record<string, unknown>[];
  return rows as unknown as Payment[];
}

export function getPaymentsByProject(projectId: string): Payment[] {
  return getPaymentsByProjectForWorkspace(undefined, projectId);
}

export function getPaymentsByProjectForWorkspace(workspaceId: string | undefined, projectId: string): Payment[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, project_id AS projectId, amount, date, created_at AS createdAt FROM payments WHERE workspace_id = ? AND project_id = ? ORDER BY date DESC"
    )
    .all(wsId, projectId) as Record<string, unknown>[];
  return rows as unknown as Payment[];
}
