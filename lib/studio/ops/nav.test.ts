import { describe, expect, it } from "vitest";
import { studioOpsSectionVisible } from "@/lib/studio/ops/nav";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";

describe("studioOpsSectionVisible", () => {
  it("always shows overview", () => {
    expect(studioOpsSectionVisible("overview", [], false)).toBe(true);
  });

  it("shows tenant sections for legacy admin", () => {
    expect(studioOpsSectionVisible("mirotech", [], true)).toBe(true);
  });

  it("hides mirotech without permission", () => {
    expect(studioOpsSectionVisible("mirotech", [], false)).toBe(false);
  });

  it("shows mirotech with project read", () => {
    const perms: PlatformPermission[] = ["mirotech.project.read"];
    expect(studioOpsSectionVisible("mirotech", perms, false)).toBe(true);
  });
});
