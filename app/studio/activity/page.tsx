import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioActivityTable } from "@/components/studio/StudioActivityTable";
import { StudioSystemStatusPanel } from "@/components/studio/StudioSystemStatusPanel";
import { PLATFORM_AUDIT_ACTOR_TYPES } from "@/lib/platform/audit/types";
import {
  allowedAuditTenants,
  canViewStudioActivity,
} from "@/lib/studio/access";
import { listStudioAuditActivity } from "@/lib/studio/activity/list-studio-activity";
import { getStudioSystemStatus } from "@/lib/studio/activity/system-status";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import type { PlatformAuditActorType } from "@/lib/platform/audit/types";

type Props = {
  searchParams: Promise<{
    tenant?: string;
    action?: string;
    actorType?: string;
    resourceType?: string;
    since?: string;
    until?: string;
    cursor?: string;
  }>;
};

function parseTenant(raw: string | undefined, allowed: TenantSlug[]): TenantSlug | "all" {
  if (raw === "all" && allowed.length > 1) return "all";
  if (raw === "brightline" || raw === "mirotech") {
    return allowed.includes(raw) ? raw : allowed[0] ?? "brightline";
  }
  return allowed.length > 1 ? "all" : allowed[0] ?? "brightline";
}

function parseActorType(raw: string | undefined): PlatformAuditActorType | undefined {
  if (!raw) return undefined;
  return (PLATFORM_AUDIT_ACTOR_TYPES as readonly string[]).includes(raw)
    ? (raw as PlatformAuditActorType)
    : undefined;
}

function buildFilterQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "cursor") {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join("&");
}

export default async function StudioActivityPage({ searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioActivity(context.permissions, legacyAdmin, context.memberships)) {
    notFound();
  }

  const params = await searchParams;
  const allowedTenants = allowedAuditTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  const tenantFilter = parseTenant(params.tenant, allowedTenants);

  const [activity, systemStatus] = await Promise.all([
    listStudioAuditActivity({
      allowedTenants,
      filters: {
        tenant: tenantFilter,
        action: params.action,
        actorType: parseActorType(params.actorType),
        resourceType: params.resourceType,
        since: params.since,
        until: params.until,
        cursor: params.cursor,
      },
    }),
    getStudioSystemStatus(),
  ]);

  const filterQuery = buildFilterQuery({
    tenant: tenantFilter === "all" ? "all" : tenantFilter,
    action: params.action,
    actorType: params.actorType,
    resourceType: params.resourceType,
    since: params.since,
    until: params.until,
  });

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Activity</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Platform audit trail — what happened, who initiated it, and whether it succeeded.
      </p>

      <div className="mt-6">
        <StudioSystemStatusPanel status={systemStatus} />
      </div>

      {!activity.enabled ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">
          Audit recording is disabled (`PLATFORM_AUDIT_ENABLED=false`). Historical events may still
          appear below.
        </p>
      ) : null}

      <form
        method="GET"
        action="/studio/activity"
        className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {allowedTenants.length > 1 ? (
          <label className="text-sm text-white/70">
            Tenant
            <select
              name="tenant"
              defaultValue={tenantFilter === "all" ? "all" : tenantFilter}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            >
              <option value="all">All permitted</option>
              {allowedTenants.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm text-white/70">
          Action contains
          <input
            name="action"
            defaultValue={params.action ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            placeholder="publishing.completed"
          />
        </label>
        <label className="text-sm text-white/70">
          Actor type
          <select
            name="actorType"
            defaultValue={params.actorType ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          >
            <option value="">Any</option>
            {PLATFORM_AUDIT_ACTOR_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/70">
          Resource type
          <input
            name="resourceType"
            defaultValue={params.resourceType ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            placeholder="job"
          />
        </label>
        <label className="text-sm text-white/70">
          Since (ISO date)
          <input
            name="since"
            type="date"
            defaultValue={params.since?.slice(0, 10) ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-white/70">
          Until (ISO date)
          <input
            name="until"
            type="date"
            defaultValue={params.until?.slice(0, 10) ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="mt-6">
        <StudioActivityTable
          events={activity.events}
          nextCursor={activity.nextCursor}
          filterQuery={filterQuery}
        />
      </div>

      <p className="mt-6 text-xs text-white/40">
        Showing tenants: {allowedTenants.join(", ")}. Cross-tenant activity is never exposed.
      </p>
    </div>
  );
}
