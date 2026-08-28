import { describe, expect, it } from "vitest";
import {
  createPlatformContext,
  createPlatformContextForTenant,
} from "@/lib/platform/context/types";
import {
  resolveTenantByHostname,
  resolveTenantBySlug,
  TenantResolutionError,
  tryResolveTenantBySlug,
} from "@/lib/platform/tenants/resolver";
import { normalizeTenantHostname } from "@/lib/platform/tenants/normalize-hostname";

describe("tenant resolver", () => {
  it("resolves brightline and mirotech by slug", () => {
    expect(resolveTenantBySlug("brightline").displayName).toBe("Brightline Photography");
    expect(resolveTenantBySlug("mirotech").displayName).toBe("MiroTech Solutions");
  });

  it("returns null for unknown slug via tryResolve", () => {
    expect(tryResolveTenantBySlug("unknown")).toBeNull();
  });

  it("throws TenantResolutionError for unknown slug", () => {
    expect(() => resolveTenantBySlug("unknown")).toThrow(TenantResolutionError);
    try {
      resolveTenantBySlug("unknown");
    } catch (error) {
      expect(error).toBeInstanceOf(TenantResolutionError);
      expect((error as TenantResolutionError).code).toBe("unknown_tenant");
    }
  });

  it("normalizes hostnames", () => {
    expect(normalizeTenantHostname("WWW.BrightlinePhotography.Co:443")).toBe(
      "brightlinephotography.co"
    );
  });

  it("resolves known hostnames to tenants", () => {
    expect(resolveTenantByHostname("brightlinephotography.com")?.slug).toBe("brightline");
    expect(resolveTenantByHostname("www.brightlinephotography.com")?.slug).toBe("brightline");
    expect(resolveTenantByHostname("brightlinephotography.co")?.slug).toBe("brightline");
    expect(resolveTenantByHostname("www.brightlinephotography.co")?.slug).toBe("brightline");
    expect(resolveTenantByHostname("mirotech.solutions")?.slug).toBe("mirotech");
    expect(resolveTenantByHostname("www.mirotech.solutions")?.slug).toBe("mirotech");
  });

  it("returns null for unknown hostnames", () => {
    expect(resolveTenantByHostname("unknown.example.com")).toBeNull();
    expect(resolveTenantByHostname("media.mirotech.solutions")).toBeNull();
  });
});

describe("platform context", () => {
  it("creates context for a tenant slug", () => {
    const ctx = createPlatformContextForTenant("brightline");
    expect(ctx.tenant.slug).toBe("brightline");
    expect(ctx.tenant.primaryDomain).toBe("brightlinephotography.com");
  });

  it("creates context via factory object", () => {
    const ctx = createPlatformContext({ tenant: "mirotech" });
    expect(ctx.tenant.displayName).toBe("MiroTech Solutions");
  });
});
