import { describe, expect, it } from "vitest";
import {
  CORRELATION_HEADER,
  correlationIdFromRequest,
  newCorrelationId,
} from "@/lib/observability/correlation";

describe("correlation", () => {
  it("generates 32-char hex ids", () => {
    expect(newCorrelationId()).toMatch(/^[a-f0-9]{32}$/);
  });

  it("reads valid header from request", () => {
    const id = "a".repeat(32);
    const req = new Request("https://example.com", {
      headers: { [CORRELATION_HEADER]: id },
    });
    expect(correlationIdFromRequest(req)).toBe(id);
  });

  it("generates when header missing or too short", () => {
    const req = new Request("https://example.com");
    expect(correlationIdFromRequest(req)).toMatch(/^[a-f0-9]{32}$/);
  });
});
