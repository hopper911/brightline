import { describe, expect, it } from "vitest";
import { redactLogMeta } from "@/lib/observability/redact";

describe("redactLogMeta", () => {
  it("redacts forbidden keys", () => {
    const out = redactLogMeta({
      password: "secret123",
      apiKey: "abc",
      authorization: "Bearer x",
      safe: "visible",
    });
    expect(out.password).toBe("[REDACTED]");
    expect(out.apiKey).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.safe).toBe("visible");
  });

  it("redacts sensitive string values", () => {
    const out = redactLogMeta({
      url: "https://cdn.example.com/x?token=abc",
      handoff: "ho1.abc.def",
    });
    expect(out.url).toBe("[REDACTED]");
    expect(out.handoff).toBe("[REDACTED]");
  });

  it("redacts nested objects", () => {
    const out = redactLogMeta({
      meta: { sessionToken: "abc", count: 2 },
    });
    expect(out.meta).toEqual({ sessionToken: "[REDACTED]", count: 2 });
  });
});
