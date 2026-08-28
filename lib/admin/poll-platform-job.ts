import type { JobStatus } from "@/lib/platform/jobs/types";

export type PlatformJobPollResult = {
  id: string;
  status: JobStatus;
  type: string;
  errorSummary: string | null;
  result: {
    ok: boolean;
    resourceId?: string | null;
    error?: string;
    hubProject?: Record<string, unknown>;
    hubBlog?: { post: Record<string, unknown>; summary: Record<string, unknown> };
  } | null;
};

export type PollPlatformJobOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

const DEFAULT_INTERVAL_MS = 800;
const DEFAULT_TIMEOUT_MS = 120_000;

export async function fetchPlatformJobStatus(jobId: string): Promise<PlatformJobPollResult | null> {
  const res = await fetch(`/api/admin/platform/jobs/${encodeURIComponent(jobId)}`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    ok?: boolean;
    job?: PlatformJobPollResult;
  };
  if (!res.ok || !json.ok || !json.job) return null;
  return json.job;
}

/** Poll until COMPLETED or FAILED, or timeout. */
export async function pollPlatformJobUntilDone(
  jobId: string,
  options?: PollPlatformJobOptions
): Promise<PlatformJobPollResult> {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await fetchPlatformJobStatus(jobId);
    if (!job) {
      throw new Error("Publishing job status unavailable.");
    }
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Publishing job timed out.");
}

export async function pollPlatformJobsUntilDone(
  jobIds: string[],
  options?: PollPlatformJobOptions
): Promise<Map<string, PlatformJobPollResult>> {
  const results = new Map<string, PlatformJobPollResult>();
  await Promise.all(
    jobIds.map(async (jobId) => {
      const job = await pollPlatformJobUntilDone(jobId, options);
      results.set(jobId, job);
    })
  );
  return results;
}
