import "server-only";

import { prisma } from "@/lib/prisma";
import { getPlatformFeatures } from "@/lib/platform/features";
import { isPlatformSsoConfigured } from "@/lib/platform/identity/sso/config";
import { isMirotechHandoffConfigured } from "@/lib/mirotech-admin-handoff";

export type HealthCheckStatus = "ok" | "degraded" | "error" | "disabled";

export type PlatformHealthSnapshot = {
  ok: boolean;
  ts: string;
  checks: {
    app: HealthCheckStatus;
    database: HealthCheckStatus;
  };
  /** Admin-only extended checks — no secrets or connection strings. */
  extended?: {
    sentryConfigured: boolean;
    identityEnabled: boolean;
    jobsEnabled: boolean;
    publishingEnabled: boolean;
    ssoConfigured: boolean;
    handoffConfigured: boolean;
    vercelEnv: string | null;
  };
};

async function checkDatabase(): Promise<HealthCheckStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

export async function getPlatformHealthSnapshot(options?: {
  extended?: boolean;
}): Promise<PlatformHealthSnapshot> {
  const db = await checkDatabase();
  const flags = getPlatformFeatures();
  const ok = db === "ok";

  const snapshot: PlatformHealthSnapshot = {
    ok,
    ts: new Date().toISOString(),
    checks: {
      app: "ok",
      database: db,
    },
  };

  if (options?.extended) {
    snapshot.extended = {
      sentryConfigured: Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()),
      identityEnabled: flags.identity,
      jobsEnabled: flags.jobs,
      publishingEnabled: flags.publishing,
      ssoConfigured: flags.identity && isPlatformSsoConfigured(),
      handoffConfigured: isMirotechHandoffConfigured(),
      vercelEnv: process.env.VERCEL_ENV?.trim() || null,
    };
  }

  return snapshot;
}
