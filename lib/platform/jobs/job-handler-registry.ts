import type { PlatformContext } from "@/lib/platform/context/types";
import type { JobRecord } from "@/lib/platform/jobs/types";

export type JobHandler = (
  context: PlatformContext,
  job: JobRecord
) => Promise<void>;

export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }
}

export const defaultJobHandlerRegistry = new JobHandlerRegistry();
