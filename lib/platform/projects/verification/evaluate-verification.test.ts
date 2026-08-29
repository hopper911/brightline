import { describe, expect, it } from "vitest";
import { evaluatePublishedProjectVerification } from "@/lib/platform/projects/verification/evaluate-verification";
import {
  verificationDisplayLabel,
  verificationDisplayStatus,
} from "@/lib/platform/projects/verification/types";

describe("evaluatePublishedProjectVerification", () => {
  const baseInput = {
    tenant: "brightline" as const,
    published: true,
    publishTargetOk: true,
    title: "Glass Tower",
    slug: "glass-tower",
    publicPath: "https://brightlinephotography.com/work/architecture/glass-tower",
    routeResolvable: true,
    mediaValidation: { valid: true, missing: [] },
    completeness: { complete: true, score: 100, missing: [], warnings: [] },
  };

  it("marks healthy when all checks pass", () => {
    const result = evaluatePublishedProjectVerification({
      ...baseInput,
      publicPageHead: { ok: true, transient: false, statusCode: 200 },
      heroMediaHead: { ok: true, transient: false, statusCode: 200 },
    });
    expect(result.verificationHealthy).toBe(true);
    expect(result.verificationWarning).toBe(false);
    expect(result.verificationFailed).toBe(false);
  });

  it("marks failed on hard public page errors", () => {
    const result = evaluatePublishedProjectVerification({
      ...baseInput,
      publicPageHead: { ok: false, transient: false, statusCode: 404, detail: "HTTP 404" },
    });
    expect(result.verificationFailed).toBe(true);
    expect(result.verificationHealthy).toBe(false);
  });

  it("marks warning on transient network failures", () => {
    const result = evaluatePublishedProjectVerification({
      ...baseInput,
      publicPageHead: { ok: false, transient: true, detail: "timeout" },
    });
    expect(result.verificationWarning).toBe(true);
    expect(result.verificationFailed).toBe(false);
  });

  it("marks warning on snapshot drift", () => {
    const result = evaluatePublishedProjectVerification({
      ...baseInput,
      publishedSnapshot: {
        title: "Old title",
        slug: "old-slug",
        publicPath: baseInput.publicPath,
        publishedAt: "2026-01-01T00:00:00.000Z",
        heroKey: "hero.jpg",
        summary: "Summary",
      },
    });
    expect(result.verificationWarning).toBe(true);
    expect(result.details).toContain("snapshot-drift");
  });
});

describe("verification display helpers", () => {
  it("maps stored flags to display status", () => {
    expect(
      verificationDisplayStatus({
        verificationHealthy: true,
        verificationWarning: false,
        verificationFailed: false,
      })
    ).toBe("verified");
    expect(verificationDisplayLabel("verified")).toBe("Verified");
    expect(verificationDisplayLabel("failed")).toBe("Failed");
  });
});
