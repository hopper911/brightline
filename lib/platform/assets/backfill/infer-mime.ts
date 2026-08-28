/** Best-effort mime from filename extension — no remote discovery. */
export function inferMimeTypeFromFilename(filename: string | null | undefined): string | null {
  if (!filename?.trim()) return null;
  const lower = filename.trim().toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop() ?? "" : "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    default:
      return null;
  }
}
