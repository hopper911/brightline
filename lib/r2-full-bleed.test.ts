import { describe, expect, it } from "vitest";
import { resolveFullBleedMediaUrl } from "@/lib/r2";

describe("resolveFullBleedMediaUrl", () => {
  it("upgrades portfolio thumb keys to web_full in proxy URLs", () => {
    expect(
      resolveFullBleedMediaUrl("portfolio/adv/web_thumb/jewelry-01.webp")
    ).toBe("/api/media/public?key=portfolio%2Fadv%2Fweb_full%2Fjewelry-01.webp");
  });

  it("leaves non-portfolio paths unchanged", () => {
    expect(resolveFullBleedMediaUrl("site/backgrounds/hero.mp4")).toBe(
      "/api/media/public?key=site%2Fbackgrounds%2Fhero.mp4"
    );
  });
});
