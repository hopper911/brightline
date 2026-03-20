import { getDemoModeFromContext } from "@/lib/runtime/demoContext";

export class DemoModeWriteError extends Error {
  name = "DemoModeWriteError";
}

export function assertNotDemoMode(actionLabel: string): void {
  if (!getDemoModeFromContext()) return;
  throw new DemoModeWriteError(`Demo mode: ${actionLabel} is disabled.`);
}

