"use server";

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";

export type ImageScanResult = {
  total_images: number;
  blurry_images: string[];
  low_resolution: string[];
  possible_duplicates: string[][];
};

export async function scanFolder(
  formData: FormData
): Promise<ImageScanResult | { error: string }> {
  const raw = formData.get("folderPath") ?? "";
  const folderPath = typeof raw === "string" ? raw.trim() : "";
  if (!folderPath) {
    return { error: "Folder path is required" };
  }

  const tool = getTool("scan_image_folder");
  if (!tool) {
    return { error: "Scan tool not found" };
  }

  try {
    const result = (await tool.run({ folderPath })) as ImageScanResult | { error: string };
    if ("error" in result) {
      return result;
    }
    logEvent({
      room: "editing",
      agent: "Editing Agent",
      type: "folder_scanned",
      status: "success",
      summary: "Editing Agent scanned folder",
    });
    return result;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Scan failed",
    };
  }
}
