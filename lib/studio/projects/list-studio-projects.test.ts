import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindMany = vi.fn();
const mockListHub = vi.fn();
const mockEvaluate = vi.fn();
const mockDerive = vi.fn();
const mockSiteSettingFindMany = vi.fn();
const mockSiteSettingFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workProject: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    siteSetting: {
      findMany: (...args: unknown[]) => mockSiteSettingFindMany(...args),
      findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/dual-brand/studio-hub", () => ({
  listHubProjects: (...args: unknown[]) => mockListHub(...args),
}));

vi.mock("@/lib/platform/projects/server", () => ({
  defaultProjectWorkflowService: {
    evaluateCompleteness: (...args: unknown[]) => mockEvaluate(...args),
    deriveLifecycle: (...args: unknown[]) => mockDerive(...args),
  },
}));

import { listStudioProjects } from "@/lib/studio/projects/list-studio-projects";

const memberships = [
  { tenantSlug: "brightline" as const, role: "EDITOR" as const },
  { tenantSlug: "mirotech" as const, role: "EDITOR" as const },
];

describe("listStudioProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      {
        id: "wp-1",
        title: "Tower",
        slug: "tower",
        section: "ACD",
        summary: null,
        description: null,
        published: false,
        heroMediaId: null,
        seoTitle: null,
        metaDescription: null,
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
        heroMedia: null,
        _count: { media: 0 },
      },
    ]);
    mockListHub.mockResolvedValue([
      {
        id: "hub-1",
        title: "SaaS Case",
        slug: "saas-case",
        summary: "Summary",
        status: "REVIEW",
        publishMirotech: true,
        sections: [{ type: "text", body: "x" }],
        heroImage: "hero.webp",
        updatedAt: "2026-08-02T00:00:00.000Z",
      },
    ]);
    mockEvaluate.mockReturnValue({
      complete: false,
      score: 40,
      missing: ["hero asset"],
      warnings: [],
    });
    mockDerive.mockImplementation((input: { tenant: string }) => {
      if (input.tenant === "mirotech") return "IN_REVIEW";
      return "DRAFT";
    });
  });

  it("lists brightline projects for authorized legacy admin", async () => {
    const result = await listStudioProjects({
      memberships,
      permissions: [],
      legacyAdmin: true,
      tenantFilter: "brightline",
    });
    expect(result.items.length).toBe(1);
    expect(result.items[0].tenant).toBe("brightline");
    expect(result.items[0].completenessScore).toBe(40);
    expect(result.canCreateBrightline).toBe(true);
  });

  it("filters by tenant mirotech", async () => {
    const result = await listStudioProjects({
      memberships,
      permissions: [],
      legacyAdmin: true,
      tenantFilter: "mirotech",
    });
    expect(result.items.length).toBe(1);
    expect(result.items[0].lifecycle).toBe("IN_REVIEW");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("filters by status review", async () => {
    const result = await listStudioProjects({
      memberships,
      permissions: [],
      legacyAdmin: true,
      tenantFilter: "all",
      statusFilter: "review",
    });
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe("hub-1");
  });

  it("denies create flags for viewer without permissions", async () => {
    const result = await listStudioProjects({
      memberships: [{ tenantSlug: "brightline", role: "VIEWER" }],
      permissions: ["brightline.journal.read"],
      legacyAdmin: false,
      tenantFilter: "brightline",
    });
    expect(result.canCreateBrightline).toBe(false);
    expect(result.canCreateMirotech).toBe(false);
  });

  it("paginates results", async () => {
    mockFindMany.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: `wp-${i}`,
        title: `Project ${i}`,
        slug: `project-${i}`,
        section: "ACD",
        summary: "s",
        description: null,
        published: false,
        heroMediaId: null,
        seoTitle: null,
        metaDescription: null,
        updatedAt: new Date(`2026-08-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`),
        heroMedia: null,
        _count: { media: 0 },
      }))
    );
    mockDerive.mockReturnValue("DRAFT");

    const result = await listStudioProjects({
      memberships: [{ tenantSlug: "brightline", role: "EDITOR" }],
      permissions: ["brightline.project.create"],
      legacyAdmin: false,
      tenantFilter: "brightline",
      page: 2,
      pageSize: 10,
    });

    expect(result.total).toBe(30);
    expect(result.page).toBe(2);
    expect(result.items.length).toBe(10);
  });
});
