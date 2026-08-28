import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioPublishingRetryButton } from "@/components/studio/StudioPublishingRetryButton";
import {
  allowedPublishingTenants,
  canRetryPublishingJob,
  canViewStudioPublishing,
} from "@/lib/studio/access";
import { getStudioPublishingJobDetail } from "@/lib/studio/publishing/list-publishing-dashboard";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function StudioPublishingJobPage({ params }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioPublishing(context.permissions, legacyAdmin)) {
    notFound();
  }

  const { jobId } = await params;
  const allowedTenants = allowedPublishingTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  const job = await getStudioPublishingJobDetail({
    allowedTenants,
    jobId,
  });
  if (!job) {
    notFound();
  }

  const canRetry =
    job.retryable &&
    canRetryPublishingJob(job.tenantSlug as "brightline" | "mirotech", context.permissions, legacyAdmin);

  return (
    <div>
      <Link href="/studio/publishing" className="text-sm text-white/55 hover:text-white">
        ← Back to publishing
      </Link>
      <h2 className="mt-4 font-display text-2xl text-white">{job.type}</h2>
      <p className="mt-2 text-sm text-white/55">Job {job.id}</p>

      <dl className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Status</dt>
          <dd className="mt-1 text-white/80">{job.status}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Tenant</dt>
          <dd className="mt-1 text-white/80">{job.tenantSlug}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Attempts</dt>
          <dd className="mt-1 text-white/80">{job.attempts}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Target</dt>
          <dd className="mt-1 text-white/80">{job.target ?? "—"}</dd>
        </div>
        {job.source ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Resource</dt>
            <dd className="mt-1 text-white/80">
              {job.source.type} / {job.source.id} ({job.source.tenant})
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Created</dt>
          <dd className="mt-1 text-white/80">{new Date(job.createdAt).toLocaleString()}</dd>
        </div>
        {job.failedAt ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Failed</dt>
            <dd className="mt-1 text-white/80">{new Date(job.failedAt).toLocaleString()}</dd>
          </div>
        ) : null}
        {job.errorSummary ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Error summary</dt>
            <dd className="mt-1 text-red-200/85">{job.errorSummary}</dd>
          </div>
        ) : null}
        {job.result?.error ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Result</dt>
            <dd className="mt-1 text-white/70">{job.result.error}</dd>
          </div>
        ) : null}
      </dl>

      {canRetry ? (
        <div className="mt-6">
          <StudioPublishingRetryButton jobId={job.id} tenant={job.tenantSlug} />
        </div>
      ) : null}

      <p className="mt-6 text-xs text-white/40">
        Payloads, stack traces, and provider credentials are not shown.
      </p>
    </div>
  );
}
