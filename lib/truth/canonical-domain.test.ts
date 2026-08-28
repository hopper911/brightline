import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_IMAGES_HOST,
  CANONICAL_MEDIA_ORIGIN,
  CANONICAL_SITE_DOMAIN,
  CANONICAL_SITE_ORIGIN,
  isBrightlineSiteHost,
  isLegacyBrightlineCoHost,
  LEGACY_BRIGHTLINE_SITE_DOMAIN,
} from "@/lib/truth/brand-lock";
import { findLegacyCoDomainViolations } from "@/lib/truth/canonical-domain";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("canonical Brightline domain lock", () => {
  it("freezes .com as the only canonical site domain", () => {
    expect(CANONICAL_SITE_ORIGIN).toBe("https://brightlinephotography.com");
    expect(CANONICAL_SITE_DOMAIN).toBe("brightlinephotography.com");
    expect(CANONICAL_MEDIA_ORIGIN).toBe("https://media.brightlinephotography.com");
    expect(CANONICAL_IMAGES_HOST).toBe("images.brightlinephotography.com");
    expect(LEGACY_BRIGHTLINE_SITE_DOMAIN).toBe("brightlinephotography.co");
  });

  it("recognizes .com and legacy .co hosts for stored URL compatibility", () => {
    expect(isBrightlineSiteHost("brightlinephotography.com")).toBe(true);
    expect(isBrightlineSiteHost("www.brightlinephotography.com")).toBe(true);
    expect(isBrightlineSiteHost("brightlinephotography.co")).toBe(true);
    expect(isLegacyBrightlineCoHost("images.brightlinephotography.co")).toBe(true);
    expect(isBrightlineSiteHost("example.com")).toBe(false);
  });

  it("repo must not use brightlinephotography.co outside the legacy allowlist", () => {
    const violations = findLegacyCoDomainViolations(appRoot);
    expect(violations).toEqual([]);
  });
});
