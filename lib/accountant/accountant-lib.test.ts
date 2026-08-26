import { describe, expect, it } from "vitest";
import { assertPermission, type AccountantPortalContext } from "./auth";
import { csvEscape, rowsToCsv } from "./csv";

describe("csv", () => {
  it("escapes quotes and commas", () => {
    expect(csvEscape(`say "hi"`)).toBe(`"say ""hi"""`);
    expect(csvEscape("a,b")).toBe(`"a,b"`);
  });

  it("produces stable header row and CRLF line endings", () => {
    const csv = rowsToCsv(
      ["a", "b"],
      [
        [1, "x"],
        ["y,z", null],
      ]
    );
    expect(csv.startsWith("a,b\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("assertPermission", () => {
  it("allows when flag true", () => {
    const ctx: AccountantPortalContext = {
      kind: "owner",
      accountantAccess: null,
      permissions: {
        canViewInvoices: true,
        canViewPayments: false,
        canViewExpenses: false,
        canViewTransactions: false,
        canUploadReceipts: false,
        canExportReports: false,
        canDownloadDocuments: false,
        canAddAccountingNotes: false,
        canViewProjectFinancials: false,
        canEditExpenseCategories: false,
        canCreateExpenses: false,
        canEditExpenses: false,
      },
    };
    expect(() => assertPermission(ctx, "canViewInvoices")).not.toThrow();
  });

  it("throws when flag false", () => {
    const ctx: AccountantPortalContext = {
      kind: "owner",
      accountantAccess: null,
      permissions: {
        canViewInvoices: false,
        canViewPayments: false,
        canViewExpenses: false,
        canViewTransactions: false,
        canUploadReceipts: false,
        canExportReports: false,
        canDownloadDocuments: false,
        canAddAccountingNotes: false,
        canViewProjectFinancials: false,
        canEditExpenseCategories: false,
        canCreateExpenses: false,
        canEditExpenses: false,
      },
    };
    expect(() => assertPermission(ctx, "canViewInvoices")).toThrow();
  });
});
