import { afterEach, describe, expect, it } from "vitest";
import { isLegacyAdminHandoffEnabled } from "@/lib/platform/identity/handoff-config";

describe("isLegacyAdminHandoffEnabled", () => {
  const saved = process.env.LEGACY_ADMIN_HANDOFF_ENABLED;

  afterEach(() => {
    if (saved === undefined) delete process.env.LEGACY_ADMIN_HANDOFF_ENABLED;
    else process.env.LEGACY_ADMIN_HANDOFF_ENABLED = saved;
  });

  it("defaults to true when unset", () => {
    delete process.env.LEGACY_ADMIN_HANDOFF_ENABLED;
    expect(isLegacyAdminHandoffEnabled()).toBe(true);
  });

  it("respects explicit false", () => {
    process.env.LEGACY_ADMIN_HANDOFF_ENABLED = "false";
    expect(isLegacyAdminHandoffEnabled()).toBe(false);
  });
});
