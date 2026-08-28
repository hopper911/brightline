import { describe, expect, it, vi } from "vitest";
import type { DualBrandWorkProject } from "@/lib/dual-brand/content-api";
import type { HubProject } from "@/lib/dual-brand/studio-hub";
import { MirotechContentAdapter } from "@/lib/platform/content/adapters/mirotech-content-adapter";
import {
  ContentNotFoundError,
  ContentTenantMismatchError,
  ContentUnsupportedTypeError,
} from "@/lib/platform/content/errors";
import type { MirotechContentReadPort } from "@/lib/platform/content/integrations/mirotech-content-read-port";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

const mirotechContext = createPlatformContextForTenant("mirotech");
const brightlineContext = createPlatformContextForTenant("brightline");

const sampleWork: DualBrandWorkProject = {
  id: "work-1",
  title: "Signal Chain",
  slug: "signal-chain",
  summary: "Case study summary",
  year: 2025,
  categories: ["product"],
  disciplines: ["design"],
  featured: true,
  sortOrder: 1,
  publishedAt: "2025-06-01T00:00:00.000Z",
  publishMirotech: true,
  publishBrightline: false,
};

const sampleHub: HubProject = {
  id: "hub-abc",
  title: "Dual Brand Project",
  slug: "dual-brand-project",
  summary: "Hub summary",
  year: 2024,
  status: "PUBLISHED",
  categories: [],
  disciplines: [],
  tools: [],
  platforms: [],
  publishMirotech: true,
  publishBrightline: true,
  sortOrderMirotech: 0,
  sortOrderBrightline: 0,
  featuredMirotech: false,
  featuredBrightline: true,
  publishedAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-03-02T00:00:00.000Z",
  journalSummaries: [
    {
      id: "j1",
      slug: "launch-notes",
      title: "Launch",
      status: "DRAFT",
      primarySite: "MIROTECH",
      publishedAt: null,
      updatedAt: "2024-03-02T00:00:00.000Z",
    },
  ],
};

function createAdapter(overrides?: Partial<MirotechContentReadPort>) {
  const port: MirotechContentReadPort = {
    getHubProjectById: vi.fn(),
    getMirotechWorkBySlug: vi.fn(),
    listHubProjects: vi.fn().mockResolvedValue([]),
    listMirotechCaseStudies: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return { adapter: new MirotechContentAdapter(port), port };
}

describe("MirotechContentAdapter", () => {
  it("supports mirotech case study and dual-brand work refs only", () => {
    const { adapter } = createAdapter();
    expect(
      adapter.supports({ tenant: "mirotech", type: "mirotech-case-study", id: "signal-chain" })
    ).toBe(true);
    expect(
      adapter.supports({ tenant: "mirotech", type: "dual-brand-work", id: "hub-abc" })
    ).toBe(true);
    expect(adapter.supports({ tenant: "mirotech", type: "mirotech-journal", id: "x" })).toBe(false);
    expect(adapter.supports({ tenant: "brightline", type: "work-project", id: "x" })).toBe(false);
  });

  it("rejects wrong tenant on read", async () => {
    const { adapter } = createAdapter();
    await expect(
      adapter.resolveReference(brightlineContext, {
        tenant: "brightline",
        type: "mirotech-case-study",
        id: "signal-chain",
      })
    ).rejects.toThrow(ContentTenantMismatchError);
  });

  it("rejects unsupported content type", async () => {
    const { adapter } = createAdapter();
    await expect(
      adapter.getPublished(mirotechContext, {
        tenant: "mirotech",
        type: "mirotech-journal",
        id: "post-1",
      })
    ).rejects.toThrow(ContentUnsupportedTypeError);
  });

  it("returns null when mirotech case study not found", async () => {
    const { adapter, port } = createAdapter({
      getMirotechWorkBySlug: vi.fn().mockResolvedValue(null),
    });
    const ref = { tenant: "mirotech" as const, type: "mirotech-case-study" as const, id: "missing" };
    await expect(adapter.getByRef(ref)).resolves.toBeNull();
    expect(port.getMirotechWorkBySlug).toHaveBeenCalledWith("missing");
  });

  it("throws ContentNotFoundError in strict mode", async () => {
    const { adapter } = createAdapter({
      getHubProjectById: vi.fn().mockResolvedValue(null),
    });
    await expect(
      adapter.getByRef(
        { tenant: "mirotech", type: "dual-brand-work", id: "missing-hub" },
        { strict: true }
      )
    ).rejects.toThrow(ContentNotFoundError);
  });

  it("maps published mirotech case study by slug", async () => {
    const { adapter } = createAdapter({
      getMirotechWorkBySlug: vi.fn().mockResolvedValue(sampleWork),
    });
    const ref = { tenant: "mirotech" as const, type: "mirotech-case-study" as const, id: "signal-chain" };
    const summary = await adapter.resolveReference(mirotechContext, ref);
    expect(summary).toMatchObject({
      title: "Signal Chain",
      slug: "signal-chain",
      lifecycle: "published",
      publicPath: "https://mirotech.solutions/work/signal-chain",
    });

    const published = await adapter.getPublished(mirotechContext, ref);
    expect(published?.payload).toMatchObject({
      title: "Signal Chain",
      slug: "signal-chain",
      heroImageKey: null,
    });

    const status = await adapter.getStatus(mirotechContext, ref);
    expect(status).toMatchObject({
      lifecycle: "published",
      publishMirotech: true,
    });
  });

  it("maps dual-brand hub project by id including distribution", async () => {
    const { adapter } = createAdapter({
      getHubProjectById: vi.fn().mockResolvedValue(sampleHub),
    });
    const ref = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id: "hub-abc" };
    const summary = await adapter.getByRef(ref);
    expect(summary).toMatchObject({
      title: "Dual Brand Project",
      lifecycle: "published",
    });

    const published = await adapter.getPublished(mirotechContext, ref);
    expect(published?.slug).toBe("dual-brand-project");

    const distribution = await adapter.getDistribution(mirotechContext, ref);
    expect(distribution).toEqual({
      ref,
      brightline: "live",
      mirotech: "live",
      journal: "draft",
    });
  });

  it("returns null published snapshot when hub is not live on mirotech", async () => {
    const { adapter } = createAdapter({
      getHubProjectById: vi.fn().mockResolvedValue({
        ...sampleHub,
        status: "DRAFT",
        publishMirotech: true,
      }),
    });
    const ref = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id: "hub-abc" };
    await expect(adapter.getPublished(mirotechContext, ref)).resolves.toBeNull();
  });
});
