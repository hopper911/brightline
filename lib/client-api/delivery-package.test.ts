import { prisma } from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDeliverablePackageItem } from "./delivery-package";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deliveryPackage: { findUnique: vi.fn() },
    deliveryPackageItem: { findFirst: vi.fn() },
  },
}));

const mockPkg = prisma.deliveryPackage.findUnique as ReturnType<typeof vi.fn>;
const mockItem = prisma.deliveryPackageItem.findFirst as ReturnType<typeof vi.fn>;

describe("resolveDeliverablePackageItem (IDOR)", () => {
  beforeEach(() => {
    mockPkg.mockReset();
    mockItem.mockReset();
  });

  it("returns 404 when package token is unknown", async () => {
    mockPkg.mockResolvedValue(null);
    const r = await resolveDeliverablePackageItem("bad-token", "any");
    expect(r).toEqual({ ok: false, status: 404 });
    expect(mockItem).not.toHaveBeenCalled();
  });

  it("returns 404 when item is not in package or not selected for delivery", async () => {
    mockPkg.mockResolvedValue({
      id: "pkg1",
      expiresAt: null,
    });
    mockItem.mockResolvedValue(null);
    const r = await resolveDeliverablePackageItem("tok", "item1");
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
  });

  it("returns ok when package valid and item selected with storage key", async () => {
    mockPkg.mockResolvedValue({
      id: "pkg1",
      expiresAt: null,
    });
    mockItem.mockResolvedValue({
      id: "item1",
      deliveryPackageId: "pkg1",
      storageKey: "k/full.jpg",
      mediaAsset: { keyFull: "k/full.jpg", keyThumb: null },
      selectedForDelivery: true,
    });
    const r = await resolveDeliverablePackageItem("tok", "item1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.key).toBe("k/full.jpg");
    }
  });

  it("returns 404 when package is expired", async () => {
    mockPkg.mockResolvedValue({
      id: "pkg1",
      expiresAt: new Date(Date.now() - 1),
    });
    const r = await resolveDeliverablePackageItem("tok", "item1");
    expect(r).toEqual({ ok: false, status: 404 });
    expect(mockItem).not.toHaveBeenCalled();
  });
});
