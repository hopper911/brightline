import { describe, expect, it } from "vitest";
import { isAcceptedVideoFile } from "./keys";
import {
  isLikelyStillImage,
  looksLikeVideoByMagic,
  partitionVideoDrop,
  rejectReasonForFile,
} from "./pick-files";

describe("video-port pick-files", () => {
  it("flags Photos still exports clearly", () => {
    const name = "38234400-FD12-41E4-A604-D928A9A5831D_4_5005_c.jpeg";
    expect(isAcceptedVideoFile({ name, type: "image/jpeg" })).toBe(false);
    expect(isLikelyStillImage({ name, type: "image/jpeg" })).toBe(true);
    expect(rejectReasonForFile({ name, type: "image/jpeg" })).toMatch(/photo still/i);
  });

  it("accepts MOV companions and ignores stills in the same drop", async () => {
    const still = new File([new Uint8Array([0xff, 0xd8, 0xff])], "clip.jpeg", {
      type: "image/jpeg",
    });
    // Minimal ftyp box so magic sniff would pass if needed; MIME is enough here.
    const movBytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
    ]);
    const mov = new File([movBytes], "clip.mov", { type: "video/quicktime" });
    const part = await partitionVideoDrop([still, mov]);
    expect(part.videos).toHaveLength(1);
    expect(part.videos[0]?.name).toBe("clip.mov");
    expect(part.ignoredStills).toBe(1);
    expect(part.skippedReasons).toHaveLength(0);
  });

  it("sniffs ftyp when extension/MIME are wrong", async () => {
    const bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    const file = new File([bytes], "mystery.bin", { type: "application/octet-stream" });
    expect(await looksLikeVideoByMagic(file)).toBe(true);
  });

  it("does not sniff jpeg as video", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "x.jpeg", {
      type: "image/jpeg",
    });
    expect(await looksLikeVideoByMagic(file)).toBe(false);
  });
});
