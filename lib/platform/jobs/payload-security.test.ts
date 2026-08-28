import { describe, expect, it } from "vitest";

import { JobPayloadError } from "@/lib/platform/jobs/errors";
import { assertSafeJobPayload } from "@/lib/platform/jobs/payload-security";

describe("assertSafeJobPayload", () => {
  it("allows stable reference payloads", () => {
    expect(() =>
      assertSafeJobPayload({
        resourceType: "blog-post",
        resourceId: "post-1",
        nested: { count: 2, ok: true },
      })
    ).not.toThrow();
  });

  it("rejects forbidden keys", () => {
    expect(() => assertSafeJobPayload({ apiKey: "abc" })).toThrow(JobPayloadError);
    expect(() => assertSafeJobPayload({ nested: { sessionToken: "x" } })).toThrow(JobPayloadError);
  });

  it("rejects suspicious secret-like string values", () => {
    expect(() => assertSafeJobPayload({ note: "sk_live_abc123" })).toThrow(JobPayloadError);
    expect(() =>
      assertSafeJobPayload({ note: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" })
    ).toThrow(JobPayloadError);
  });
});
