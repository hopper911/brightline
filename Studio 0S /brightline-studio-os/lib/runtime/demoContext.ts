import { AsyncLocalStorage } from "node:async_hooks";

type DemoContext = {
  demoMode: boolean;
};

const demoContext = new AsyncLocalStorage<DemoContext>();

export function getDemoModeFromContext(): boolean {
  return demoContext.getStore()?.demoMode ?? false;
}

export async function runWithDemoMode<T>(demoMode: boolean, fn: () => Promise<T>): Promise<T> {
  return demoContext.run({ demoMode }, fn);
}

