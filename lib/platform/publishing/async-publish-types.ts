/** Enqueue-only publishing — client polls GET /api/admin/platform/jobs/[jobId]. */
export type AsyncPublishAccepted = {
  accepted: true;
  jobId: string;
  reused?: boolean;
};

export function isAsyncPublishAccepted(value: unknown): value is AsyncPublishAccepted {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as AsyncPublishAccepted).accepted === true &&
    typeof (value as AsyncPublishAccepted).jobId === "string"
  );
}
