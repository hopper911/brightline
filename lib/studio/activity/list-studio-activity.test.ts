import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/audit/repository", () => ({
  listPlatformAuditEvents: vi.fn(),
  findPlatformAuditEventById: vi.fn(),
}));

import { listPlatformAuditEvents } from "@/lib/platform/audit/repository";
import { listStudioAuditActivity } from "@/lib/studio/activity/list-studio-activity";

describe("listStudioAuditActivity", () => {
  beforeEach(() => {
    vi.mocked(listPlatformAuditEvents).mockReset();
  });

  it("returns empty when no allowed tenants", async () => {
    const result = await listStudioAuditActivity({
      allowedTenants: [],
      filters: {},
    });
    expect(result.events).toEqual([]);
    expect(listPlatformAuditEvents).not.toHaveBeenCalled();
  });

  it("scopes query to allowed tenants", async () => {
    vi.mocked(listPlatformAuditEvents).mockResolvedValue({
      items: [
        {
          id: "e1",
          tenantId: null,
          tenantSlug: "brightline",
          actorType: "USER",
          actorId: "u1",
          action: "publishing.completed",
          resourceType: "blog-post",
          resourceId: "p1",
          metadata: null,
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
        },
      ],
    });

    const result = await listStudioAuditActivity({
      allowedTenants: ["brightline"],
      filters: { tenant: "brightline", action: "publishing" },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].succeeded).toBe(true);
    expect(listPlatformAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ tenantSlugs: ["brightline"], action: "publishing" })
    );
  });
});
