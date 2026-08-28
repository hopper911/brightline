import { describe, expect, it } from "vitest";

import { buildPublishingMirotechJournalIdempotencyKey } from "@/lib/platform/jobs/publishing-payload";

describe("publishing job payload", () => {
  it("builds stable idempotency keys from content version", () => {
    const source = { tenant: "brightline" as const, type: "blog-post" as const, id: "post-1" };
    const a = buildPublishingMirotechJournalIdempotencyKey({
      source,
      target: "mirotech-site",
      operation: "sync",
      contentVersion: "2024-01-01T00:00:00.000Z",
    });
    const b = buildPublishingMirotechJournalIdempotencyKey({
      source,
      target: "mirotech-site",
      operation: "sync",
      contentVersion: "2024-01-02T00:00:00.000Z",
    });
    expect(a).toContain("post-1");
    expect(a).not.toBe(b);
  });
});
