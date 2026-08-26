import { describe, expect, it } from "vitest";
import {
  sanitizeHubBlogPayload,
  sanitizeHubProjectPayload,
} from "@/lib/dual-brand/studio-hub-payload";
import { safeAiClientError } from "@/lib/ai/safe-client-error";
import { FAL_DOWNLOAD_HOST_SUFFIXES, CANVA_DOWNLOAD_HOST_SUFFIXES } from "@/lib/safe-fetch-url";

describe("studio hub payload allowlist", () => {
  it("strips unknown project keys", () => {
    const out = sanitizeHubProjectPayload({
      title: "Ops dashboard",
      slug: "ops-dashboard",
      evil: "drop-me",
      __proto__: { admin: true },
      publishMirotech: true,
      photoNarrative: { overview: "Light", inject: "nope" },
    });
    expect(out.title).toBe("Ops dashboard");
    expect(out.publishMirotech).toBe(true);
    expect(out).not.toHaveProperty("evil");
    expect(out.photoNarrative).toEqual({ overview: "Light" });
  });

  it("strips unknown blog keys and clips strings", () => {
    const out = sanitizeHubBlogPayload({
      title: "Post",
      body: "x".repeat(30),
      journalId: "j1",
      secretToken: "nope",
    });
    expect(out.title).toBe("Post");
    expect(out.journalId).toBe("j1");
    expect(out).not.toHaveProperty("secretToken");
  });
});

describe("safe AI client errors", () => {
  it("maps credential failures", () => {
    const err = Object.assign(new Error("401 Unauthorized"), { status: 401 });
    const safe = safeAiClientError(err);
    expect(safe.code).toBe("openai_credentials");
    expect(safe.status).toBe(502);
  });

  it("does not leak raw provider text for unknown 502s", () => {
    const safe = safeAiClientError(new Error("Request req_abc failed at sk-live-secret"));
    expect(safe.error).toBe("AI generation failed.");
    expect(safe.error).not.toMatch(/sk-live/);
  });
});

describe("provider download host allowlists", () => {
  it("includes fal and canva suffixes", () => {
    expect(FAL_DOWNLOAD_HOST_SUFFIXES).toContain("fal.media");
    expect(CANVA_DOWNLOAD_HOST_SUFFIXES).toContain("canva.com");
  });
});
