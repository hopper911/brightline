import { describe, expect, it } from "vitest";

import {
  assertValidEnqueueInput,
  isValidPlatformJobType,
  PLATFORM_HEALTH_TEST_JOB,
} from "@/lib/platform/jobs/types";

describe("platform job types", () => {
  it("accepts dotted lowercase job types", () => {
    expect(isValidPlatformJobType(PLATFORM_HEALTH_TEST_JOB)).toBe(true);
    expect(isValidPlatformJobType("publishing.mirotech.sync")).toBe(true);
  });

  it("rejects invalid job types", () => {
    expect(isValidPlatformJobType("")).toBe(false);
    expect(isValidPlatformJobType("UPPER.case")).toBe(false);
    expect(isValidPlatformJobType("no-dashes")).toBe(false);
  });

  it("assertValidEnqueueInput normalizes type and default payload", () => {
    const input = assertValidEnqueueInput({ type: "  platform.health.test  " });
    expect(input.type).toBe("platform.health.test");
    expect(input.payload).toEqual({});
  });
});
