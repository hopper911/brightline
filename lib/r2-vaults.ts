/**
 * Dual-bucket R2 hub: Brightline photography vault vs Mirotech site vault.
 * Buckets stay separate; only the admin R2 manager UI is combined.
 */

import { mergeParentDotenvIntoProcess } from "@/lib/merge-parent-dotenv";

export {
  isR2VaultId,
  MIROTECH_SITE_ALLOWED_PREFIXES,
  MIROTECH_SITE_ROOTS,
  normalizeR2VaultId,
  resolveVaultForListPrefix,
  R2_VAULT_IDS,
  type R2VaultId,
  type R2VaultRoot,
} from "@/lib/r2-vaults-shared";

import type { R2VaultId } from "@/lib/r2-vaults-shared";

function normalizeCredential(value: string | undefined): string {
  if (value == null || typeof value !== "string") return "";
  return value
    .replace(/\r\n|\r|\n/g, "")
    .replace(/[\u201C\u201D\u2018\u2019]/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export type R2VaultCredentials = {
  vault: R2VaultId;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

export function isMirotechSiteVaultConfigured(): boolean {
  mergeParentDotenvIntoProcess();
  return Boolean(
    normalizeCredential(process.env.MIROTECH_R2_ACCESS_KEY_ID) &&
      normalizeCredential(process.env.MIROTECH_R2_SECRET_ACCESS_KEY) &&
      normalizeCredential(process.env.MIROTECH_R2_BUCKET) &&
      (normalizeCredential(process.env.MIROTECH_R2_ENDPOINT) ||
        normalizeCredential(process.env.R2_ENDPOINT))
  );
}

/**
 * Resolve S3 credentials for a vault.
 * Throws with `.status` 503 when Mirotech-site env is incomplete.
 */
export function getR2VaultCredentials(vault: R2VaultId = "brightline"): R2VaultCredentials {
  mergeParentDotenvIntoProcess();

  if (vault === "mirotech-site") {
    const accessKeyId = normalizeCredential(process.env.MIROTECH_R2_ACCESS_KEY_ID);
    const secretAccessKey = normalizeCredential(process.env.MIROTECH_R2_SECRET_ACCESS_KEY);
    const bucket = normalizeCredential(process.env.MIROTECH_R2_BUCKET).replace(/\/$/, "");
    const endpoint = (
      normalizeCredential(process.env.MIROTECH_R2_ENDPOINT) ||
      normalizeCredential(process.env.R2_ENDPOINT)
    ).replace(/\/$/, "");
    const region =
      normalizeCredential(process.env.MIROTECH_R2_REGION) ||
      process.env.R2_REGION ||
      "auto";
    const publicUrl = (
      normalizeCredential(process.env.MIROTECH_R2_PUBLIC_URL) ||
      normalizeCredential(process.env.NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL)
    ).replace(/\/$/, "");

    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
      throw Object.assign(
        new Error(
          "Mirotech site R2 is not configured. Set MIROTECH_R2_ACCESS_KEY_ID, MIROTECH_R2_SECRET_ACCESS_KEY, MIROTECH_R2_BUCKET, and MIROTECH_R2_ENDPOINT (or share R2_ENDPOINT) on Brightline."
        ),
        { status: 503, code: "mirotech_r2_unconfigured" }
      );
    }
    if (!bucket.toLowerCase().startsWith("mirotech")) {
      throw Object.assign(
        new Error('MIROTECH_R2_BUCKET must start with "mirotech".'),
        { status: 503, code: "mirotech_r2_bad_bucket" }
      );
    }

    return {
      vault,
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicUrl,
    };
  }

  const endpoint = normalizeCredential(process.env.R2_ENDPOINT).replace(/\/$/, "");
  const region = process.env.R2_REGION || "auto";
  const accessKeyId = normalizeCredential(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = normalizeCredential(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = normalizeCredential(process.env.R2_BUCKET).replace(/\/$/, "");
  const publicUrl = (
    normalizeCredential(process.env.R2_PUBLIC_URL) ||
    normalizeCredential(process.env.NEXT_PUBLIC_R2_PUBLIC_URL)
  ).replace(/\/$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).");
  }
  if (!bucket) throw new Error("R2_BUCKET not set.");

  return {
    vault: "brightline",
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  };
}

export function mirotechSitePublicObjectUrl(key: string): string | null {
  const clean = key.replace(/^\/+/, "");
  if (!clean) return null;
  try {
    const { publicUrl } = getR2VaultCredentials("mirotech-site");
    if (!publicUrl) return null;
    return `${publicUrl}/${clean}`;
  } catch {
    return null;
  }
}
