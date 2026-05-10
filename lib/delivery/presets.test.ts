import { describe, expect, it } from "vitest";
import { DELIVERY_FOLDER_TREE_README, DELIVERY_PRESETS } from "./presets";

describe("delivery folder layout for client packages", () => {
  it("every export preset declares a non-empty folderPath under PROJECT_NAME/", () => {
    for (const p of DELIVERY_PRESETS) {
      expect(p.folderPath, p.id).toMatch(/\S/);
      expect(p.folderPath).not.toMatch(/^\//);
    }
  });

  it("folder tree readme documents the canonical image folder structure", () => {
    expect(DELIVERY_FOLDER_TREE_README).toContain("01_FINAL_FULL_RES");
    expect(DELIVERY_FOLDER_TREE_README).toContain("02_WEB_READY");
    expect(DELIVERY_FOLDER_TREE_README).toContain("07_METADATA");
  });
});
