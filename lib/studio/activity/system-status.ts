import "server-only";

import { getPlatformHealthSnapshot } from "@/lib/platform/observability/health";
import { getPlatformFeatures } from "@/lib/platform/features";
import type { HealthCheckStatus } from "@/lib/platform/observability/health";

export type StudioSystemComponentStatus = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
};

export type StudioSystemStatusSnapshot = {
  ts: string;
  ok: boolean;
  components: StudioSystemComponentStatus[];
};

function labelFor(status: HealthCheckStatus): string {
  if (status === "ok") return "Operational";
  if (status === "disabled") return "Disabled";
  if (status === "degraded") return "Degraded";
  return "Error";
}

/** Lightweight system status — uses existing health snapshot + feature flags only. */
export async function getStudioSystemStatus(): Promise<StudioSystemStatusSnapshot> {
  const health = await getPlatformHealthSnapshot({ extended: true });
  const flags = getPlatformFeatures();
  const ext = health.extended;

  const components: StudioSystemComponentStatus[] = [
    {
      id: "platform-api",
      label: "Platform API",
      status: health.checks.app,
      detail: labelFor(health.checks.app),
    },
    {
      id: "database",
      label: "Database",
      status: health.checks.database,
      detail: labelFor(health.checks.database),
    },
    {
      id: "media",
      label: "Media provider",
      status: flags.media && flags.assets ? "ok" : flags.media ? "degraded" : "disabled",
      detail: flags.media
        ? flags.assets
          ? "Media + registry enabled"
          : "Media enabled, registry off"
        : "Disabled",
    },
    {
      id: "jobs",
      label: "Job provider",
      status: flags.jobs ? "ok" : "disabled",
      detail: flags.jobs ? "Jobs enabled" : "Disabled",
    },
    {
      id: "publishing",
      label: "Publishing",
      status: flags.publishing ? "ok" : "disabled",
      detail: flags.publishing ? "Publishing enabled" : "Disabled",
    },
    {
      id: "authentication",
      label: "Authentication",
      status: ext?.identityEnabled
        ? ext.ssoConfigured
          ? "ok"
          : "degraded"
        : "disabled",
      detail: ext?.identityEnabled
        ? ext.ssoConfigured
          ? "Identity + SSO configured"
          : "Identity on, SSO not configured"
        : "Identity disabled",
    },
  ];

  return {
    ts: health.ts,
    ok: health.ok,
    components,
  };
}
