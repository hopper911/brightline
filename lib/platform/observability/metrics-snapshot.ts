import "server-only";

import { prisma } from "@/lib/prisma";
import { getAssetReadMetrics } from "@/lib/platform/assets/read-observability";
import { getPlatformFeatures } from "@/lib/platform/features";

const WINDOW_HOURS = 24;

const PUBLISHING_JOB_PREFIX = "publishing.";
const SSO_FAILED_ACTION = "identity.sso.failed";

export type PlatformMetricsSnapshot = {
  windowHours: number;
  generatedAt: string;
  jobs: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    publishingCompleted: number;
    publishingFailed: number;
  };
  audit: {
    ssoFailed: number;
    ssoCompleted: number;
    ssoStarted: number;
  };
  assetRead: {
    success: number;
    fallbackLegacy: number;
    missing: number;
    tenantMismatch: number;
  };
  flags: ReturnType<typeof getPlatformFeatures>;
};

function sinceDate(): Date {
  return new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
}

export async function getPlatformMetricsSnapshot(): Promise<PlatformMetricsSnapshot> {
  const since = sinceDate();

  const [jobGroups, auditGroups, assetRead] = await Promise.all([
    prisma.platformJob.groupBy({
      by: ["status", "type"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.platformAuditEvent.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: since },
        action: { startsWith: "identity.sso." },
      },
      _count: { _all: true },
    }),
    Promise.resolve(getAssetReadMetrics()),
  ]);

  const jobs = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    publishingCompleted: 0,
    publishingFailed: 0,
  };

  for (const row of jobGroups) {
    const count = row._count._all;
    const status = row.status.toUpperCase();
    if (status === "PENDING") jobs.pending += count;
    else if (status === "RUNNING") jobs.running += count;
    else if (status === "COMPLETED") jobs.completed += count;
    else if (status === "FAILED") jobs.failed += count;

    if (row.type.startsWith(PUBLISHING_JOB_PREFIX)) {
      if (status === "COMPLETED") jobs.publishingCompleted += count;
      if (status === "FAILED") jobs.publishingFailed += count;
    }
  }

  const audit = { ssoFailed: 0, ssoCompleted: 0, ssoStarted: 0 };
  for (const row of auditGroups) {
    const count = row._count._all;
    if (row.action === SSO_FAILED_ACTION) audit.ssoFailed = count;
    if (row.action === "identity.sso.completed") audit.ssoCompleted = count;
    if (row.action === "identity.sso.started") audit.ssoStarted = count;
  }

  return {
    windowHours: WINDOW_HOURS,
    generatedAt: new Date().toISOString(),
    jobs,
    audit,
    assetRead: {
      success: assetRead.assetReadSuccess,
      fallbackLegacy: assetRead.assetFallbackLegacy,
      missing: assetRead.assetMissing,
      tenantMismatch: assetRead.assetTenantMismatch,
    },
    flags: getPlatformFeatures(),
  };
}
