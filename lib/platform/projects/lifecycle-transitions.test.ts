import { describe, expect, it } from "vitest";
import {
  allowedNextLifecycles,
  canTransitionLifecycle,
  requiresApprovalPermission,
  requiresCompletenessForReview,
  resolveEffectiveLifecycle,
} from "@/lib/platform/projects/lifecycle-transitions";

describe("lifecycle transitions", () => {
  it("allows forward review pipeline", () => {
    expect(canTransitionLifecycle("MEDIA_READY", "IN_REVIEW")).toBe(true);
    expect(canTransitionLifecycle("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionLifecycle("APPROVED", "PUBLISHED")).toBe(true);
  });

  it("allows useful backward transitions", () => {
    expect(canTransitionLifecycle("IN_REVIEW", "MEDIA_READY")).toBe(true);
    expect(canTransitionLifecycle("APPROVED", "IN_REVIEW")).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(canTransitionLifecycle("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransitionLifecycle("DRAFT", "APPROVED")).toBe(false);
  });

  it("flags completeness and approval requirements", () => {
    expect(requiresCompletenessForReview("IN_REVIEW")).toBe(true);
    expect(requiresCompletenessForReview("APPROVED")).toBe(false);
    expect(requiresApprovalPermission("APPROVED")).toBe(true);
    expect(requiresApprovalPermission("PUBLISHED")).toBe(true);
    expect(requiresApprovalPermission("IN_REVIEW")).toBe(false);
  });

  it("prefers stored lifecycle after review begins", () => {
    expect(resolveEffectiveLifecycle("APPROVED", "MEDIA_READY", false)).toBe("APPROVED");
    expect(resolveEffectiveLifecycle("IN_REVIEW", "MEDIA_READY", false)).toBe("IN_REVIEW");
  });

  it("published always wins", () => {
    expect(resolveEffectiveLifecycle("APPROVED", "MEDIA_READY", true)).toBe("PUBLISHED");
  });

  it("lists allowed next states", () => {
    expect(allowedNextLifecycles("IN_REVIEW")).toEqual(["MEDIA_READY", "APPROVED"]);
  });
});
