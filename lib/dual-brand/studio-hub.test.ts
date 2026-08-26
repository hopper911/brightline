import { describe, expect, it } from "vitest";
import { distributionStatus } from "@/lib/dual-brand/studio-hub";

describe("distributionStatus", () => {
  it("marks surfaces off / draft / live independently", () => {
    expect(
      distributionStatus({
        workStatus: "DRAFT",
        publishBrightline: true,
        publishMirotech: false,
        blogStatus: "PUBLISHED",
      })
    ).toEqual({
      brightlineWork: "draft",
      mirotechWork: "off",
      blog: "live",
    });

    expect(
      distributionStatus({
        workStatus: "PUBLISHED",
        publishBrightline: true,
        publishMirotech: true,
        blogStatus: null,
      })
    ).toEqual({
      brightlineWork: "live",
      mirotechWork: "live",
      blog: "off",
    });
  });
});
