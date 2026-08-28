import { describe, expect, it } from "vitest";
import type { JobRecord } from "@/lib/platform/jobs/types";
import type { StudioOpsContext } from "@/lib/studio/ops/types";
import { canReadPlatformPublishingJob, parseTenantSlugParam } from "@/lib/platform/http/platform-job-access";

const baseJob: JobRecord = {
  id: "job-1",
  tenantSlug: "mirotech",
  type: "publishing.mirotech.hub.patch",
  status: "COMPLETED",
  attempts: 1,
  payload: {},
  idempotencyKey: null,
  errorSummary: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  startedAt: null,
  completedAt: null,
  failedAt: null,
};

function context(partial: Partial<StudioOpsContext>): StudioOpsContext {
  return {
    ok: true,
    subjectKind: "platform_user",
    userId: "user-1",
    email: "ops@example.com",
    activeTenant: "brightline",
    memberships: [{ tenantSlug: "brightline", role: "EDITOR" }],
    permissions: ["brightline.journal.publish"],
    identityEnabled: true,
    ssoAvailable: false,
    legacyHandoffEnabled: false,
    sections: [],
    platformFlags: {
      content: true,
      media: true,
      publishing: true,
      identity: true,
      jobs: true,
      audit: true,
    },
    systemStatus: {
      identity: "ok",
      sso: "disabled",
      publishing: "ok",
      jobs: "ok",
    },
    ...partial,
  };
}

describe("parseTenantSlugParam", () => {
  it("accepts known tenants", () => {
    expect(parseTenantSlugParam("brightline")).toBe("brightline");
    expect(parseTenantSlugParam(" MIROTECH ")).toBe("mirotech");
  });

  it("rejects unknown values", () => {
    expect(parseTenantSlugParam("acme")).toBeNull();
    expect(parseTenantSlugParam("")).toBeNull();
  });
});

describe("canReadPlatformPublishingJob", () => {
  it("denies cross-tenant job read for platform users", () => {
    const allowed = canReadPlatformPublishingJob(context({}), baseJob);
    expect(allowed).toBe(false);
  });

  it("allows tenant publish permission for matching job tenant", () => {
    const allowed = canReadPlatformPublishingJob(
      context({
        memberships: [{ tenantSlug: "mirotech", role: "EDITOR" }],
        permissions: ["mirotech.journal.publish"],
        activeTenant: "mirotech",
      }),
      baseJob
    );
    expect(allowed).toBe(true);
  });

  it("denies when operator lacks publishing visibility", () => {
    const allowed = canReadPlatformPublishingJob(
      context({
        permissions: ["brightline.journal.read"],
      }),
      { ...baseJob, tenantSlug: "brightline" }
    );
    expect(allowed).toBe(false);
  });

  it("allows legacy admin with membership in job tenant", () => {
    const allowed = canReadPlatformPublishingJob(
      context({
        subjectKind: "legacy_admin",
        permissions: [],
        memberships: [
          { tenantSlug: "brightline", role: "OWNER" },
          { tenantSlug: "mirotech", role: "OWNER" },
        ],
      }),
      baseJob
    );
    expect(allowed).toBe(true);
  });
});
