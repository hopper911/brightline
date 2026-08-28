import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/observability/health", () => ({
  getPlatformHealthSnapshot: vi.fn(),
}));

vi.mock("@/lib/platform/features", () => ({
  getPlatformFeatures: vi.fn(),
  isPlatformFeatureEnabled: vi.fn(),
}));

import { getPlatformHealthSnapshot } from "@/lib/platform/observability/health";
import { getPlatformFeatures } from "@/lib/platform/features";
import { getStudioSystemStatus } from "@/lib/studio/activity/system-status";

describe("getStudioSystemStatus", () => {
  beforeEach(() => {
    vi.mocked(getPlatformHealthSnapshot).mockResolvedValue({
      ok: true,
      ts: "2024-01-01T00:00:00.000Z",
      checks: { app: "ok", database: "ok" },
      extended: {
        sentryConfigured: false,
        identityEnabled: true,
        jobsEnabled: false,
        publishingEnabled: true,
        ssoConfigured: false,
        handoffConfigured: true,
        vercelEnv: "preview",
      },
    });
    vi.mocked(getPlatformFeatures).mockReturnValue({
      content: true,
      media: true,
      assets: true,
      assetRead: false,
      publishing: true,
      identity: true,
      jobs: false,
      audit: true,
    });
  });

  it("reports degraded authentication when SSO not configured", async () => {
    const status = await getStudioSystemStatus();
    const auth = status.components.find((c) => c.id === "authentication");
    expect(auth?.status).toBe("degraded");
    expect(status.components.find((c) => c.id === "jobs")?.status).toBe("disabled");
  });
});
