import { describe, expect, it } from "vitest";
import { parseAssetBackfillCliArgs } from "@/lib/platform/assets/backfill/parse-cli-args";

describe("parseAssetBackfillCliArgs", () => {
  it("parses required source and dry-run", () => {
    const parsed = parseAssetBackfillCliArgs([
      "--source=brightline-portfolio",
      "--dry-run",
      "--limit=25",
    ]);
    expect(parsed).toEqual({
      source: "brightline-portfolio",
      dryRun: true,
      limit: 25,
      cursor: undefined,
      recordId: undefined,
      verifyStorage: false,
    });
  });

  it("honors DRY_RUN env", () => {
    const prev = process.env.DRY_RUN;
    process.env.DRY_RUN = "1";
    try {
      const parsed = parseAssetBackfillCliArgs(["--source=brightline-portfolio"]);
      expect(parsed.dryRun).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.DRY_RUN;
      else process.env.DRY_RUN = prev;
    }
  });

  it("rejects unknown source", () => {
    expect(() => parseAssetBackfillCliArgs(["--source=unknown"])).toThrow(/Unknown source/);
  });
});
