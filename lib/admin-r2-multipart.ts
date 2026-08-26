import type { R2VaultId } from "@/lib/r2-vaults-shared";

/** Staging prefixes for vault-aware R2 multipart uploads (≤3MB chunks via Vercel). */
export const R2_UPLOAD_STAGING_ROOT: Record<R2VaultId, string> = {
  brightline: "tmp/r2-upload/",
  "mirotech-site": "site/.upload-parts/",
};

export function r2UploadStagingPrefix(vault: R2VaultId, stagingId: string): string {
  const root = R2_UPLOAD_STAGING_ROOT[vault];
  return `${root}${stagingId}/`;
}

export function assertR2UploadStagingPrefix(prefix: string, vault: R2VaultId): string {
  const clean = prefix.replace(/^\/+/, "");
  const expected = R2_UPLOAD_STAGING_ROOT[vault];
  if (!clean.startsWith(expected) || clean.includes("..")) {
    throw Object.assign(new Error("Invalid staging prefix."), { status: 400 });
  }
  return clean.endsWith("/") ? clean : `${clean}/`;
}

export function stagingId(): string {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function safeUploadFileName(name: string): string {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 180);
}

/** R2/S3: every part except the last must be ≥ 5 MiB. */
export const R2_MULTIPART_MIN_PART = 5 * 1024 * 1024;

export const R2_UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;

export const R2_UPLOAD_MAX_PART_BYTES = 3.5 * 1024 * 1024;
