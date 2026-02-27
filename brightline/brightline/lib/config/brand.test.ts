import { describe, it, expect } from "vitest";
import {
  BRAND,
  getUrl,
  getMailtoLink,
  getImageAltFallback,
} from "./brand";

describe("BRAND", () => {
  it("has required config", () => {
    expect(BRAND.name).toBe("Bright Line Photography");
    expect(BRAND.url).toContain("brightlinephotography");
    expect(BRAND.contact.email).toBeDefined();
  });
});

describe("getUrl", () => {
  it("returns base URL when no path", () => {
    expect(getUrl()).toBe(BRAND.url);
  });
  it("appends path with leading slash", () => {
    expect(getUrl("/contact")).toBe(`${BRAND.url}/contact`);
  });
  it("returns path as-is when it starts with http", () => {
    expect(getUrl("https://example.com")).toBe("https://example.com");
  });
});

describe("getMailtoLink", () => {
  it("returns mailto link for email", () => {
    expect(getMailtoLink("test@example.com")).toBe("mailto:test@example.com");
  });
  it("uses BRAND email when no arg", () => {
    expect(getMailtoLink()).toContain("mailto:");
    expect(getMailtoLink()).toContain(BRAND.contact.email);
  });
});

describe("getImageAltFallback", () => {
  it("includes category when provided", () => {
    expect(getImageAltFallback("Hospitality")).toContain("Hospitality");
    expect(getImageAltFallback("Hospitality")).toContain(BRAND.name);
  });
  it("returns generic when no category", () => {
    expect(getImageAltFallback()).toContain("Photography");
    expect(getImageAltFallback()).toContain(BRAND.name);
  });
});
