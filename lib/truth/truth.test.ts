import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/config/brand";
import { DEFAULT_SITE_NAV, normalizeSiteNav } from "@/lib/site-nav";
import { ALLOWED_UPLOAD_MIME, normalizeUploadContentType } from "@/lib/upload-mime";
import {
  CANONICAL_SITE_ORIGIN,
  CORE_PUBLIC_NAV,
  FORBIDDEN_UPLOAD_CONTENT_TYPES,
  PUBLIC_NAV_BRAND,
  SERVICE_AREA_LOCATIONS,
  SITE_STATE,
  TRUTH_FROZEN_AT,
} from "@/lib/truth";
import { pathRequiresCsrf } from "@/lib/truth/security";
import { assertCorePublicNavPreserved } from "@/lib/truth/public-chrome";

describe("frozen truth — permanent baseline", () => {
  it("locks freeze date and production origin", () => {
    expect(TRUTH_FROZEN_AT).toBe("2026-08-01");
    expect(SITE_STATE.productionOrigin).toBe(CANONICAL_SITE_ORIGIN);
    expect(BRAND.url).toBe(CANONICAL_SITE_ORIGIN);
    expect(CANONICAL_SITE_ORIGIN).toBe("https://brightlinephotography.com");
    expect(CANONICAL_SITE_ORIGIN.endsWith(".com")).toBe(true);
  });

  it("locks public nav brand wording", () => {
    expect(PUBLIC_NAV_BRAND.primary).toBe("BRIGHTLINE");
    expect(PUBLIC_NAV_BRAND.secondary).toBe("PHOTOGRAPHY");
    expect(PUBLIC_NAV_BRAND.wordmarkInTopNav).toBe(false);
  });

  it("locks core public nav labels and hrefs; SHOW stays CMS-editable", () => {
    expect(CORE_PUBLIC_NAV.map((n) => n.label)).toEqual([
      "Work",
      "Galleries",
      "Services",
      "About",
      "Contact",
    ]);
    for (const core of CORE_PUBLIC_NAV) {
      const def = DEFAULT_SITE_NAV.find((n) => n.id === core.id);
      expect(def?.label).toBe(core.label);
      expect(def?.href).toBe(core.href);
      expect(def?.visible).toBe(true);
    }
  });

  it("restores core nav labels/hrefs but allows hiding via SHOW", () => {
    const tampered = normalizeSiteNav([
      { id: "work", label: "Portfolio", href: "/elsewhere", visible: false },
      { id: "galleries", label: "Galleries", href: "/galleries", visible: true },
      { id: "services", label: "Services", href: "/services", visible: true },
      { id: "about", label: "About", href: "/about", visible: true },
      { id: "contact", label: "Contact", href: "/contact", visible: true },
    ]);
    const locked = assertCorePublicNavPreserved(tampered);
    const work = locked.find((n) => n.id === "work");
    expect(work?.label).toBe("Work");
    expect(work?.href).toBe("/work");
    expect(work?.visible).toBe(false);
  });

  it("locks NJ/NY metro service area", () => {
    expect([...BRAND.contact.locations]).toEqual([...SERVICE_AREA_LOCATIONS]);
  });

  it("rejects forbidden upload MIME types", () => {
    for (const ct of FORBIDDEN_UPLOAD_CONTENT_TYPES) {
      expect(normalizeUploadContentType(ct)).toBeNull();
    }
    expect(ALLOWED_UPLOAD_MIME.has("image/jpeg")).toBe(true);
    expect(ALLOWED_UPLOAD_MIME.has("image/svg+xml")).toBe(false);
  });

  it("requires CSRF on admin/studio/accountant/ai APIs", () => {
    expect(pathRequiresCsrf("/api/admin/clients")).toBe(true);
    expect(pathRequiresCsrf("/api/studio/invoices/1")).toBe(true);
    expect(pathRequiresCsrf("/api/accountant/notes")).toBe(true);
    expect(pathRequiresCsrf("/api/ai/chat")).toBe(true);
    expect(pathRequiresCsrf("/api/ai/alt-text")).toBe(true);
    expect(pathRequiresCsrf("/api/accountant/login")).toBe(false);
    expect(pathRequiresCsrf("/api/admin/login")).toBe(false);
    expect(pathRequiresCsrf("/api/contact")).toBe(false);
  });
});
