import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockWorkCreate = vi.fn();
const mockMirotechCreate = vi.fn();
const mockAuthCan = vi.fn();
const mockAudit = vi.fn();
const mockGetPillar = vi.fn();
const mockGetPrimarySection = vi.fn();
const mockPrismaFind = vi.fn();
const mockPrismaCreate = vi.fn();
const mockSiteSettingUpsert = vi.fn();

vi.mock("@/lib/platform/projects/adapters/brightline-work-adapter", () => ({
  createBrightlineWorkProjectDraft: (...args: unknown[]) => mockWorkCreate(...args),
}));

vi.mock("@/lib/platform/projects/adapters/mirotech-case-study-adapter", () => ({
  createMirotechCaseStudyDraft: (...args: unknown[]) => mockMirotechCreate(...args),
}));

vi.mock("@/lib/platform/authorization/default-authorization-service", () => ({
  defaultAuthorizationService: {
    can: (...args: unknown[]) => mockAuthCan(...args),
  },
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/lib/work-pillar-settings", () => ({
  getPillarBySlug: (...args: unknown[]) => mockGetPillar(...args),
  getPrimaryWorkSection: (...args: unknown[]) => mockGetPrimarySection(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workProject: {
      findFirst: (...args: unknown[]) => mockPrismaFind(...args),
      create: (...args: unknown[]) => mockPrismaCreate(...args),
    },
    siteSetting: {
      upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
    },
  },
}));

import { DefaultProjectWorkflowService } from "@/lib/platform/projects/default-project-workflow-service";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { ProjectSlugConflictError } from "@/lib/platform/projects/errors";
import { normalizeProjectSlugInput, resolveProjectSlug } from "@/lib/platform/projects/slug";
import { validateBrightlineProjectCompleteness } from "@/lib/platform/projects/completeness/brightline-work-project";
import { validateMirotechProjectCompleteness } from "@/lib/platform/projects/completeness/mirotech-case-study";
import { ProjectWorkflowPermissionDeniedError } from "@/lib/platform/projects/errors";

describe("project slug", () => {
  it("normalizes title to lowercase slug", () => {
    expect(normalizeProjectSlugInput("Glass Tower — NYC")).toBe("glass-tower-nyc");
  });

  it("rejects slug conflict when policy is reject", async () => {
    await expect(
      resolveProjectSlug({
        title: "Glass Tower",
        conflictPolicy: "reject",
        isTaken: async () => true,
      })
    ).rejects.toBeInstanceOf(ProjectSlugConflictError);
  });
});

describe("completeness validators", () => {
  it("flags missing hero on draft Brightline project", () => {
    const result = validateBrightlineProjectCompleteness({
      title: "Tower",
      slug: "tower",
      section: "ACD",
      summary: "Summary text",
      description: null,
      heroMediaId: null,
      mediaCount: 0,
      seoTitle: null,
      metaDescription: null,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("hero asset");
    expect(result.score).toBeLessThan(100);
  });

  it("flags missing outcome on Mirotech case study", () => {
    const result = validateMirotechProjectCompleteness({
      title: "Platform",
      slug: "platform",
      summary: "Summary",
      status: "DRAFT",
      heroImage: "media/hero.webp",
      thumbnailImage: null,
      sectionCount: 0,
      challenge: null,
      outcome: null,
      seoTitle: "SEO",
      seoDescription: "Desc",
      publishMirotech: true,
    });
    expect(result.complete).toBe(false);
    expect(result.missing.some((m) => m.includes("outcome") || m.includes("sections"))).toBe(true);
  });
});

describe("DefaultProjectWorkflowService", () => {
  const service = new DefaultProjectWorkflowService();
  const brightlineContext = createPlatformContextForTenant("brightline");
  const mirotechContext = createPlatformContextForTenant("mirotech");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    mockAuthCan.mockResolvedValue(true);
    mockAudit.mockResolvedValue({ ok: true, skipped: false, id: "audit-1" });
    mockSiteSettingUpsert.mockResolvedValue({});
  });

  it("creates Brightline work-project draft", async () => {
    mockWorkCreate.mockResolvedValue({
      id: "wp-1",
      slug: "glass-tower",
      section: "ACD",
      title: "Glass Tower",
      summary: null,
      description: null,
      heroMediaId: null,
      mediaCount: 0,
      seoTitle: null,
      metaDescription: null,
      published: false,
    });

    const result = await service.create(brightlineContext, { kind: "user", userId: "u1" }, {
      tenant: "brightline",
      kind: "work-project",
      title: "Glass Tower",
      pillarSlug: "acd",
    });

    expect(result.id).toBe("wp-1");
    expect(result.ref).toEqual({
      tenant: "brightline",
      type: "work-project",
      id: "wp-1",
    });
    expect(result.lifecycle).toBe("DRAFT");
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.created" })
    );
  });

  it("creates Mirotech case study via hub adapter", async () => {
    mockMirotechCreate.mockResolvedValue({
      id: "cs-1",
      slug: "ai-platform",
      title: "AI Platform",
      summary: "",
      status: "DRAFT",
      heroImage: null,
      thumbnailImage: null,
      sectionCount: 0,
      challenge: null,
      outcome: null,
      seoTitle: null,
      seoDescription: null,
      publishMirotech: true,
    });

    const result = await service.create(mirotechContext, { kind: "user", userId: "u1" }, {
      tenant: "mirotech",
      kind: "mirotech-case-study",
      title: "AI Platform",
      templateId: "ai-saas-platform",
    });

    expect(result.ref.type).toBe("mirotech-case-study");
    expect(mockMirotechCreate).toHaveBeenCalled();
  });

  it("rejects wrong tenant for kind", async () => {
    await expect(
      service.create(brightlineContext, { kind: "user", userId: "u1" }, {
        tenant: "brightline",
        kind: "mirotech-case-study",
        title: "Wrong",
      })
    ).rejects.toMatchObject({ code: "unsupported_kind" });
  });

  it("denies when RBAC blocks create", async () => {
    mockAuthCan.mockResolvedValue(false);
    await expect(
      service.create(brightlineContext, { kind: "user", userId: "u1" }, {
        tenant: "brightline",
        kind: "work-project",
        title: "Tower",
        pillarSlug: "acd",
      })
    ).rejects.toBeInstanceOf(ProjectWorkflowPermissionDeniedError);
  });

  it("records status change audit", async () => {
    await service.recordStatusChange(
      brightlineContext,
      { kind: "user", userId: "u1" },
      {
        tenant: "brightline",
        ref: { tenant: "brightline", type: "work-project", id: "wp-1" },
        fromLifecycle: "DRAFT",
        toLifecycle: "IN_REVIEW",
      }
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.status.changed" })
    );
  });
});
