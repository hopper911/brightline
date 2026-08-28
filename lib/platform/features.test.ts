import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getPlatformFeatures,
  isPlatformFeatureEnabled,
  parsePlatformEnvFlag,
  PLATFORM_FEATURE_ENV_KEYS,
} from "@/lib/platform/features";

const ENV_KEYS = Object.values(PLATFORM_FEATURE_ENV_KEYS);

describe("platform feature flags", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("defaults all flags to false when env is unset", () => {
    const flags = getPlatformFeatures();
    expect(flags).toEqual({
      content: false,
      media: false,
      assets: false,
      assetRead: false,
      publishing: false,
      identity: false,
      jobs: false,
      audit: false,
    });
    expect(isPlatformFeatureEnabled("content")).toBe(false);
    expect(isPlatformFeatureEnabled("media")).toBe(false);
  });

  it("parses true-like env values", () => {
    process.env.PLATFORM_MEDIA_ENABLED = "true";
    process.env.PLATFORM_JOBS_ENABLED = "1";
    expect(getPlatformFeatures().media).toBe(true);
    expect(getPlatformFeatures().jobs).toBe(true);
    expect(getPlatformFeatures().content).toBe(false);
  });

  it("parsePlatformEnvFlag honors defaultWhenUnset", () => {
    delete process.env.PLATFORM_CONTENT_ENABLED;
    expect(parsePlatformEnvFlag("PLATFORM_CONTENT_ENABLED")).toBe(false);
    expect(parsePlatformEnvFlag("PLATFORM_CONTENT_ENABLED", true)).toBe(true);
    process.env.PLATFORM_CONTENT_ENABLED = "false";
    expect(parsePlatformEnvFlag("PLATFORM_CONTENT_ENABLED", true)).toBe(false);
  });
});
