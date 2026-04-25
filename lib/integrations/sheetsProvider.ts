export type SheetSyncInput = {
  entity: "projects" | "payments" | "expenses" | "clients";
  rows: Record<string, unknown>[];
};

export type SheetsProvider = {
  name: string;
  sync(input: SheetSyncInput): Promise<{ provider: string; syncedRows: number }>;
};

const googleSheetsPlaceholderProvider: SheetsProvider = {
  name: "google-sheets-placeholder",
  async sync() {
    throw new Error("Google Sheets sync is not configured.");
  },
};

export function getSheetsProvider(): SheetsProvider | null {
  if (process.env.STUDIO_OS_SHEETS_PROVIDER === "google") {
    return googleSheetsPlaceholderProvider;
  }
  return null;
}
