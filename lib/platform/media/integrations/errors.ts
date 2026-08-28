import { isMediaError } from "@/lib/platform/media/errors";

/** Safe client-facing message — never expose raw R2/AWS errors. */
export function adminMediaUploadUrlErrorMessage(error: unknown): string {
  if (isMediaError(error)) {
    if (error.code === "configuration") {
      return "Media storage is not configured.";
    }
    return "Could not prepare upload.";
  }
  if (error instanceof Error && error.message.includes("Missing storage env vars")) {
    return error.message;
  }
  return "Could not prepare upload.";
}

export function adminMediaSignErrorMessage(): string {
  return "Media temporarily unavailable.";
}
