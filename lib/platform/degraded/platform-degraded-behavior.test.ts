/**
 * Degraded-mode behavior — business actions should succeed or fail predictably when
 * optional platform subsystems (audit, asset registry, media provider) are unavailable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PlatformAssetRegistryService } from "@/lib/platform/assets/registry-service";
import { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { JobHandlerRegistry } from "@/lib/platform/jobs/job-handler-registry";
import { MemoryJobProvider } from "@/lib/platform/jobs/memory-job-provider";
import { DefaultMediaService } from "@/lib/platform/media/default-media-service";
import { MediaDownloadError } from "@/lib/platform/media/errors";
import type { MediaProvider } from "@/lib/platform/media/media-provider";
import { testPlatformContext } from "@/lib/testing/fixtures";

const { mockUpsert, mockAudit } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/platform/assets/repository", () => ({
  upsertPlatformAssetFromStorageRef: mockUpsert,
  findPlatformAssetById: vi.fn(),
  findPlatformAssetByStorageRef: vi.fn(),
}));

vi.mock("@/lib/platform/tenants/repository", () => ({
  ensurePlatformTenant: vi.fn().mockResolvedValue({ id: "tenant-brightline", slug: "brightline" }),
}));

vi.mock("@/lib/platform/media/resolve-bucket", () => ({
  resolveMediaBucket: vi.fn().mockReturnValue("brightline-test"),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: mockAudit,
}));

describe("degraded — asset registry unavailable during upload registration", () => {
  const service = new PlatformAssetRegistryService();
  const context = testPlatformContext("brightline");
  const savedEnv = process.env.PLATFORM_ASSET_REGISTRY_ENABLED;

  beforeEach(() => {
    mockUpsert.mockReset();
    mockAudit.mockReset();
    process.env.PLATFORM_ASSET_REGISTRY_ENABLED = "true";
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.PLATFORM_ASSET_REGISTRY_ENABLED;
    else process.env.PLATFORM_ASSET_REGISTRY_ENABLED = savedEnv;
  });

  it("does not fail the upload path when registry upsert errors (non-strict)", async () => {
    mockUpsert.mockRejectedValue(new Error("registry timeout"));

    const result = await service.register(context, {
      object: { vault: "brightline", objectKey: "site/test.jpg" },
    });

    expect(result).toEqual({
      ok: true,
      skipped: true,
      reason: "failed",
      error: "registry timeout",
    });
  });
});

describe("degraded — job handler failure", () => {
  const savedEnv = process.env.PLATFORM_JOBS_ENABLED;
  const FAIL_JOB = "test.degraded.fail";

  beforeEach(() => {
    process.env.PLATFORM_JOBS_ENABLED = "true";
    mockAudit.mockReset();
    mockAudit.mockResolvedValue({ ok: true, skipped: true });
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
    else process.env.PLATFORM_JOBS_ENABLED = savedEnv;
  });

  it("marks job FAILED and records job.failed audit when handler throws", async () => {
    const registry = new JobHandlerRegistry();
    registry.register(FAIL_JOB, async () => {
      throw new Error("simulated worker failure");
    });
    const service = new DefaultJobService(new MemoryJobProvider(), registry);
    const context = testPlatformContext("brightline");

    const { jobId } = await service.enqueue(context, { type: FAIL_JOB });
    const failed = await service.runJob(context, jobId);

    expect(failed.status).toBe("FAILED");
    expect(failed.errorSummary).toContain("simulated worker failure");
    expect(failed.failedAt).toBeTruthy();

    const actions = mockAudit.mock.calls.map((c) => c[0].action);
    expect(actions).toContain("job.failed");
  });
});

describe("degraded — media provider failure", () => {
  const provider: MediaProvider = {
    signPut: vi.fn(),
    signGet: vi.fn(),
    headObject: vi.fn(),
    exists: vi.fn(),
  };

  const service = new DefaultMediaService(provider);
  const context = testPlatformContext("brightline");

  beforeEach(() => {
    vi.mocked(provider.signGet).mockReset();
    vi.mocked(provider.signPut).mockReset();
  });

  it("propagates normalized MediaError from signGet for private keys", async () => {
    const normalized = new MediaDownloadError("R2 signing failed");
    vi.mocked(provider.signGet).mockRejectedValue(normalized);

    await expect(
      service.getAssetUrl(context, {
        vault: "brightline",
        objectKey: "client-galleries/g1/private.jpg",
      })
    ).rejects.toBeInstanceOf(MediaDownloadError);
  });

  it("propagates upload signing errors from provider", async () => {
    vi.mocked(provider.signPut).mockRejectedValue(new MediaDownloadError("upload signing failed"));

    await expect(
      service.createUpload({
        context,
        object: { vault: "brightline", objectKey: "site/pages/hero.webp" },
        contentType: "image/webp",
        visibility: "private",
      })
    ).rejects.toBeInstanceOf(MediaDownloadError);
  });
});
