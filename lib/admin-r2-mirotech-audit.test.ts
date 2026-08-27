import { describe, expect, it } from "vitest";
import {
  proposeMirotechPortfolioMove,
  proposeMirotechReviewMove,
} from "./admin-r2-mirotech-audit";
import {
  inferVaultForMediaKey,
  normalizeCmsMediaKey,
} from "./admin-r2-mirotech-cms-keys";
import { replaceMediaReferenceString } from "./admin-r2-mirotech-cms-rewrite";

describe("normalizeCmsMediaKey CDN URLs", () => {
  it("extracts key from Mirotech CDN URL", () => {
    expect(
      normalizeCmsMediaKey(
        "https://media.mirotech.solutions/portfolio/cor/web_full/cor-260812-11.webp"
      )
    ).toBe("portfolio/cor/web_full/cor-260812-11.webp");
  });

  it("extracts key from Brightline media proxy URL", () => {
    expect(
      normalizeCmsMediaKey(
        "/api/media/public?key=portfolio%2Fcor%2Fweb_video%2Fcor-260826-01.mp4"
      )
    ).toBe("portfolio/cor/web_video/cor-260826-01.mp4");
  });

  it("still accepts raw keys", () => {
    expect(normalizeCmsMediaKey("projects/foo/hero.webp")).toBe("projects/foo/hero.webp");
  });
});

describe("proposeMirotechPortfolioMove", () => {
  it("maps portfolio pillar keys to mirotech/portfolio/", () => {
    const move = proposeMirotechPortfolioMove("portfolio/cor/web_full/cor-260812-11.webp");
    expect(move?.to).toBe("mirotech/portfolio/cor/web_full/cor-260812-11.webp");
    expect(move?.vault).toBe("brightline");
  });

  it("maps orphan portfolio keys to review queue", () => {
    const move = proposeMirotechReviewMove("portfolio/arc/web_video/arc-01.mp4");
    expect(move?.to).toBe("mirotech/_review/web_video/arc-arc-01.mp4");
  });
});

describe("replaceMediaReferenceString", () => {
  it("replaces raw keys", () => {
    expect(
      replaceMediaReferenceString(
        "portfolio/cor/web_full/a.webp",
        "portfolio/cor/web_full/a.webp",
        "mirotech/portfolio/cor/web_full/a.webp"
      )
    ).toBe("mirotech/portfolio/cor/web_full/a.webp");
  });

  it("replaces CDN URLs preserving host", () => {
    expect(
      replaceMediaReferenceString(
        "https://media.mirotech.solutions/portfolio/cor/web_full/a.webp",
        "portfolio/cor/web_full/a.webp",
        "mirotech/portfolio/cor/web_full/a.webp"
      )
    ).toBe("https://media.mirotech.solutions/mirotech/portfolio/cor/web_full/a.webp");
  });
});

describe("inferVaultForMediaKey", () => {
  it("keeps mirotech-site for CMS bucket keys", () => {
    expect(inferVaultForMediaKey("site/backgrounds/web/x.mp4")).toBe("mirotech-site");
  });
});
