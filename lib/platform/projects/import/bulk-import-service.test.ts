import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
import {
  parseProjectImportRequest,
  runProjectBulkImport,
} from "@/lib/platform/projects/import/bulk-import-service";
import { normalizeImportRecord } from "@/lib/platform/projects/import/validate-import-row";

vi.mock("@/lib/platform/projects/import/import-key-registry", () => ({
  findProjectImportKey: vi.fn().mockResolvedValue(null),
  registerProjectImportKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/platform/projects/adapters/brightline-work-adapter", () => ({
  createBrightlineWorkProjectDraft: vi.fn().mockResolvedValue({
    id: "wp-1",
    slug: "test-project",
    section: "ACD",
    title: "Test",
    summary: null,
    description: null,
    heroMediaId: null,
    mediaCount: 0,
    seoTitle: null,
    metaDescription: null,
    published: false,
  }),
}));

vi.mock("@/lib/platform/publishing/mirotech/hub-remote-write", () => ({
  mirotechUpdateHubProject: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workProject: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    siteSetting: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/work-pillar-settings", () => ({
  getPillarBySlug: vi.fn().mockResolvedValue({ slug: "acd", sections: ["ACD"] }),
  getPrimaryWorkSection: vi.fn().mockReturnValue("ACD"),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/platform/projects/workflow-state", () => ({
  setStoredProjectWorkflowState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/studio/media/list-studio-assets", () => ({
  getStudioAssetDetail: vi.fn().mockResolvedValue(null),
}));

describe("project bulk import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses import request with dryRun", () => {
    const parsed = parseProjectImportRequest({
      tenant: "brightline",
      kind: "work-project",
      dryRun: true,
      records: [{ title: "Tower", pillarSlug: "acd" }],
    });
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.dryRun).toBe(true);
    expect(parsed.records.length).toBe(1);
  });

  it("rejects mismatched tenant and kind", () => {
    const parsed = parseProjectImportRequest({
      tenant: "mirotech",
      kind: "work-project",
      dryRun: true,
      records: [],
    });
    expect(parsed).toEqual({ error: "Mirotech tenant requires kind mirotech-case-study." });
  });

  it("normalizes mirotech record fields", () => {
    const record = normalizeImportRecord("mirotech", "mirotech-case-study", {
      title: "AI Platform",
      problem: "Manual ops",
      solution: "Agents",
      results: "Faster triage",
      technologies: ["LLM", "Python"],
    });
    expect(record).toMatchObject({
      title: "AI Platform",
      problem: "Manual ops",
      solution: "Agents",
      results: "Faster triage",
      technologies: ["LLM", "Python"],
    });
  });

  it("dry run reports valid row without creating", async () => {
    const report = await runProjectBulkImport(
      { tenant: { slug: "brightline" } } as never,
      { kind: "legacy_admin" },
      {
        tenant: "brightline",
        kind: "work-project",
        dryRun: true,
        records: [{ title: "Tower", pillarSlug: "acd", importKey: "ext-1" }],
      }
    );
    expect(report.summary.created).toBe(0);
    expect(report.summary.valid).toBe(1);
    expect(report.rows[0]?.status).toBe("valid");
    expect(report.rows[0]?.warnings.some((w) => w.includes("Dry run"))).toBe(true);
  });
});
