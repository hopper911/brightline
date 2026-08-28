import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import { memoryJobProvider } from "@/lib/platform/jobs/memory-job-provider";
import { prismaJobProvider } from "@/lib/platform/jobs/prisma-job-provider";

/** Tests use in-memory jobs; production uses Postgres persistence. */
export function resolveDefaultJobProvider(): JobProvider {
  if (process.env.NODE_ENV === "test") {
    return memoryJobProvider;
  }
  return prismaJobProvider;
}
