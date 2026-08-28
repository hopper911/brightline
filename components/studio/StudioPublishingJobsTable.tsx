import Link from "next/link";
import type { StudioPublishingJobView } from "@/lib/studio/publishing/sanitize-job";

type Props = {
  jobs: StudioPublishingJobView[];
  nextCursor?: string;
};

function statusTone(status: string): string {
  if (status === "FAILED") return "text-red-300";
  if (status === "COMPLETED") return "text-emerald-300";
  if (status === "RUNNING") return "text-sky-300";
  return "text-white/70";
}

export function StudioPublishingJobsTable({ jobs, nextCursor }: Props) {
  if (!jobs.length) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-white/60">
        No publishing jobs in this view.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {jobs.map((job) => (
          <li key={job.id} className="bg-white/[0.03] px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/studio/publishing/jobs/${job.id}`} className="text-base text-white hover:underline">
                  {job.type}
                </Link>
                <p className={`mt-1 text-xs ${statusTone(job.status)}`}>
                  {job.status} · {job.tenantSlug} · attempts {job.attempts}
                </p>
                {job.source ? (
                  <p className="mt-1 text-xs text-white/45">
                    {job.source.type} / {job.source.id}
                    {job.target ? ` → ${job.target}` : ""}
                  </p>
                ) : null}
                {job.errorSummary ? (
                  <p className="mt-1 text-xs text-red-200/80">{job.errorSummary}</p>
                ) : null}
              </div>
              <p className="text-xs text-white/40">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
      {nextCursor ? (
        <div className="mt-4">
          <Link
            href={`/studio/publishing?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-block rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Next page →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
