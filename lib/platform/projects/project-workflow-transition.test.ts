import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockAuthCan = vi.fn();
const mockAudit = vi.fn();
const mockLoadSnapshot = vi.fn();
const mockGetStored = vi.fn();
const mockSetStored = vi.fn();
const mockApplyDomain = vi.fn();

vi.mock("@/lib/platform/authorization/default-authorization-service", () => ({
  defaultAuthorizationService: {
    can: (...args: unknown[]) => mockAuthCan(...args),
  },
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/lib/platform/projects/workflow-snapshot", () => ({
  loadProjectWorkflowSnapshot: (...args: unknown[]) => mockLoadSnapshot(...args),
}));

vi.mock("@/lib/platform/projects/workflow-state", () => ({
  getStoredProjectWorkflowState: (...args: unknown[]) => mockGetStored(...args),
  setStoredProjectWorkflowState: (...args: unknown[]) => mockSetStored(...args),
}));

vi.mock("@/lib/platform/projects/apply-domain-lifecycle", () => ({
  applyDomainLifecycleForTransition: (...args: unknown[]) => mockApplyDomain(...args),
}));

import { DefaultProjectWorkflowService } from "@/lib/platform/projects/default-project-workflow-service";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import {
  ProjectWorkflowPermissionDeniedError,
  ProjectWorkflowTransitionError,
} from "@/lib/platform/projects/errors";

const completeSnapshot = {
  tenant: "brightline" as const,
  kind: "work-project" as const,
  published: false,
  snapshot: {
    title: "Tower",
    slug: "tower",
    section: "ACD",
    summary: "Summary",
    description: "Body",
    heroMediaId: "m1",
    mediaCount: 3,
    seoTitle: "SEO",
    metaDescription: "Meta",
    heroKeyFull: "media/hero.webp",
    published: false,
  },
};

describe("project workflow transitions", () => {
  const service = new DefaultProjectWorkflowService();
  const context = createPlatformContextForTenant("brightline");
  const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "wp-1" };
  const subject = { kind: "user" as const, userId: "u1" };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    mockAuthCan.mockResolvedValue(true);
    mockAudit.mockResolvedValue({ ok: true, skipped: false, id: "audit-1" });
    mockLoadSnapshot.mockResolvedValue(completeSnapshot);
    mockGetStored.mockResolvedValue({ lifecycle: "MEDIA_READY", reviewNotes: null, updatedAt: "t" });
    mockSetStored.mockResolvedValue(undefined);
    mockApplyDomain.mockResolvedValue(undefined);
  });

  it("rejects incomplete review request with missing requirements", async () => {
    mockLoadSnapshot.mockResolvedValue({
      ...completeSnapshot,
      snapshot: {
        ...completeSnapshot.snapshot,
        heroMediaId: null,
        mediaCount: 0,
        heroKeyFull: null,
      },
    });

    await expect(
      service.transitionLifecycle(context, subject, {
        tenant: "brightline",
        ref,
        toLifecycle: "IN_REVIEW",
      })
    ).rejects.toBeInstanceOf(ProjectWorkflowTransitionError);

    await expect(
      service.transitionLifecycle(context, subject, {
        tenant: "brightline",
        ref,
        toLifecycle: "IN_REVIEW",
      })
    ).rejects.toMatchObject({ missing: expect.arrayContaining(["hero asset"]) });
  });

  it("allows valid review request and audits review_requested", async () => {
    const result = await service.transitionLifecycle(context, subject, {
      tenant: "brightline",
      ref,
      toLifecycle: "IN_REVIEW",
      reviewNotes: "Ready for partner review",
    });

    expect(result.lifecycle).toBe("IN_REVIEW");
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.review_requested" })
    );
  });

  it("requires approve permission for approval", async () => {
    mockGetStored.mockResolvedValue({ lifecycle: "IN_REVIEW", reviewNotes: null, updatedAt: "t" });
    mockAuthCan.mockImplementation(async ({ permission }: { permission: string }) => {
      return permission !== "brightline.project.approve";
    });

    await expect(
      service.transitionLifecycle(context, subject, {
        tenant: "brightline",
        ref,
        toLifecycle: "APPROVED",
      })
    ).rejects.toBeInstanceOf(ProjectWorkflowPermissionDeniedError);
  });

  it("rejects publish without approval", async () => {
    mockGetStored.mockResolvedValue({ lifecycle: "MEDIA_READY", reviewNotes: null, updatedAt: "t" });

    await expect(
      service.transitionLifecycle(context, subject, {
        tenant: "brightline",
        ref,
        toLifecycle: "PUBLISHED",
      })
    ).rejects.toBeInstanceOf(ProjectWorkflowTransitionError);
  });

  it("reopens review from approved and audits review_reopened", async () => {
    mockGetStored.mockResolvedValue({ lifecycle: "APPROVED", reviewNotes: "ok", updatedAt: "t" });

    const result = await service.transitionLifecycle(context, subject, {
      tenant: "brightline",
      ref,
      toLifecycle: "IN_REVIEW",
    });

    expect(result.lifecycle).toBe("IN_REVIEW");
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.review_reopened" })
    );
  });
});
