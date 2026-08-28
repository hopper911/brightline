import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allowedAuditTenants,
  canViewStudioActivity,
} from "@/lib/studio/access";
import { getStudioAuditEventDetail } from "@/lib/studio/activity/list-studio-activity";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function StudioActivityDetailPage({ params }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioActivity(context.permissions, legacyAdmin, context.memberships)) {
    notFound();
  }

  const { eventId } = await params;
  const allowedTenants = allowedAuditTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );

  const event = await getStudioAuditEventDetail({
    allowedTenants,
    eventId,
  });
  if (!event) {
    notFound();
  }

  return (
    <div>
      <Link href="/studio/activity" className="text-sm text-white/55 hover:text-white">
        ← Back to activity
      </Link>
      <h2 className="mt-4 font-display text-2xl text-white">{event.action}</h2>
      <p className="mt-2 text-sm text-white/55">Audit event {event.id}</p>

      <dl className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Tenant</dt>
          <dd className="mt-1 text-white/80">{event.tenantSlug}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">When</dt>
          <dd className="mt-1 text-white/80">{new Date(event.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Actor</dt>
          <dd className="mt-1 text-white/80">
            {event.actorType}
            {event.actorId ? ` · ${event.actorId}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Outcome</dt>
          <dd className="mt-1 text-white/80">
            {event.succeeded === true ? "Success" : event.succeeded === false ? "Failed" : "Unknown"}
          </dd>
        </div>
        {event.resourceType ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Resource</dt>
            <dd className="mt-1 text-white/80">
              {event.resourceType}
              {event.resourceId ? ` / ${event.resourceId}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>

      {event.metadata && Object.keys(event.metadata).length > 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">Metadata (sanitized)</p>
          <pre className="mt-3 overflow-x-auto text-xs text-white/70">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-white/40">
        Secrets and credentials are redacted at write and read boundaries.
      </p>
    </div>
  );
}
