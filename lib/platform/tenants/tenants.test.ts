import { describe, expect, it } from "vitest";
import {
  TENANT_REGISTRY,
  TENANT_SLUGS,
  getTenantConfig,
  isTenantSlug,
  listTenants,
  parseTenantSlug,
  tenantSlugFromLegacySite,
  tenantSlugFromR2Vault,
} from "@/lib/platform/tenants";

describe("platform tenants", () => {
  it("defines brightline and mirotech only", () => {
    expect(TENANT_SLUGS).toEqual(["brightline", "mirotech"]);
    expect(Object.keys(TENANT_REGISTRY).sort()).toEqual(["brightline", "mirotech"]);
  });

  it("validates tenant slugs", () => {
    expect(isTenantSlug("brightline")).toBe(true);
    expect(isTenantSlug("other")).toBe(false);
    expect(parseTenantSlug("mirotech")).toBe("mirotech");
    expect(parseTenantSlug("unknown")).toBeNull();
  });

  it("maps legacy site labels", () => {
    expect(tenantSlugFromLegacySite("mirotech-site")).toBe("mirotech");
    expect(tenantSlugFromLegacySite("BRIGHTLINE")).toBe("brightline");
  });

  it("maps R2 vault ids", () => {
    expect(tenantSlugFromR2Vault("brightline")).toBe("brightline");
    expect(tenantSlugFromR2Vault("mirotech-site")).toBe("mirotech");
  });

  it("exposes stable public origins", () => {
    expect(getTenantConfig("brightline").publicOrigin).toBe("https://brightlinephotography.com");
    expect(getTenantConfig("mirotech").publicOrigin).toBe("https://mirotech.solutions");
    expect(listTenants()).toHaveLength(2);
  });
});
