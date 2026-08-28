import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadataForDisplay } from "@/lib/platform/audit/sanitize-metadata";

describe("sanitizeAuditMetadataForDisplay", () => {
  it("redacts forbidden keys for display", () => {
    const out = sanitizeAuditMetadataForDisplay({
      target: "mirotech-site",
      token: "sso1.secret",
      apiKey: "abc",
    });
    expect(out?.target).toBe("mirotech-site");
    expect(out?.token).toBe("[REDACTED]");
    expect(out?.apiKey).toBe("[REDACTED]");
  });
});
