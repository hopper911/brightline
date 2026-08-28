import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.fn();

const client = {
  $queryRaw: mockQueryRaw,
} as unknown as import("@prisma/client").PrismaClient;

import { tableHasColumn } from "@/lib/platform/assets/backfill/db/table-has-column";

describe("tableHasColumn", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it("returns true when column exists", async () => {
    mockQueryRaw.mockResolvedValue([{ exists: true }]);
    await expect(tableHasColumn(client, "PortfolioImage", "storageKey")).resolves.toBe(true);
  });

  it("returns false when column is missing", async () => {
    mockQueryRaw.mockResolvedValue([{ exists: false }]);
    await expect(tableHasColumn(client, "PortfolioImage", "storageKey")).resolves.toBe(false);
  });
});
