/**
 * Bright Line Studio OS – image scan tool (read-only)
 *
 * Runs the Python image_scan.py script and returns parsed JSON.
 */

import { spawn } from "child_process";
import path from "path";

export type ImageScanResult = {
  total_images: number;
  blurry_images: string[];
  low_resolution: string[];
  possible_duplicates: string[][];
};

export type ImageScanError = {
  error: string;
};

function isSafePath(folderPath: string): boolean {
  const normalized = path.normalize(folderPath);
  if (normalized.includes("..")) return false;
  return true;
}

export async function runImageScan(folderPath: string): Promise<ImageScanResult | ImageScanError> {
  if (!folderPath || typeof folderPath !== "string") {
    return { error: "Folder path is required" };
  }
  const trimmed = folderPath.trim();
  if (!trimmed) {
    return { error: "Folder path is required" };
  }
  if (!isSafePath(trimmed)) {
    return { error: "Invalid path: traversal not allowed" };
  }

  const scriptPath = path.join(process.cwd(), "scripts", "image_scan.py");

  return new Promise((resolve) => {
    const proc = spawn("python3", [scriptPath, trimmed], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({
          error: stderr.trim() || `Script exited with code ${code}`,
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as ImageScanResult | ImageScanError;
        if ("error" in parsed) {
          resolve(parsed);
          return;
        }
        resolve(parsed);
      } catch {
        resolve({
          error: "Failed to parse scan output. Ensure Python and Pillow are installed.",
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        error: `Could not run Python: ${err.message}. Ensure Python 3 and Pillow are installed.`,
      });
    });
  });
}
