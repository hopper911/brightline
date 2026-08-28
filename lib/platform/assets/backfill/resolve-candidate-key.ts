import { isAllowedPublicMediaKey, isPrivateMediaKey } from "@/lib/media-key-access";
import type { PlatformAssetVisibility } from "@/lib/platform/assets/types";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";
import { inferVaultFromPrefix, type R2VaultId } from "@/lib/r2-vaults-shared";
import { extractPublicMediaKey } from "@/lib/r2";

export type ResolvedCandidateKey =
  | {
      ok: true;
      objectKey: string;
      vault: R2VaultId;
      filename: string | null;
      visibility: PlatformAssetVisibility;
      visibilityAmbiguous: boolean;
    }
  | { ok: false; reason: "invalidReference" | "missingStorage"; message: string };

function filenameFromKey(objectKey: string): string | null {
  const segment = objectKey.split("/").pop()?.trim();
  return segment || null;
}

export function resolveStorageReferenceFromStoredValue(
  stored: string | null | undefined,
  options: { expectVault?: R2VaultId; publishedPublic?: boolean }
): ResolvedCandidateKey {
  if (!stored?.trim()) {
    return { ok: false, reason: "invalidReference", message: "Empty storage reference." };
  }

  const extracted = extractPublicMediaKey(stored.trim());
  if (!extracted) {
    return { ok: false, reason: "invalidReference", message: "Could not extract object key." };
  }

  let objectKey: string;
  try {
    objectKey = assertValidMediaObjectKey(extracted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid object key.";
    return { ok: false, reason: "invalidReference", message };
  }

  const vault = inferVaultFromPrefix(objectKey) ?? "brightline";
  if (options.expectVault && vault !== options.expectVault) {
    return {
      ok: false,
      reason: "invalidReference",
      message: `Vault mismatch: expected ${options.expectVault}, inferred ${vault}.`,
    };
  }

  let visibility: PlatformAssetVisibility = "PRIVATE";
  let visibilityAmbiguous = false;

  if (options.publishedPublic) {
    if (isAllowedPublicMediaKey(objectKey)) {
      visibility = "PUBLIC";
    } else if (isPrivateMediaKey(objectKey)) {
      visibility = "PRIVATE";
      visibilityAmbiguous = true;
    } else {
      visibility = "PRIVATE";
      visibilityAmbiguous = true;
    }
  } else {
    visibility = "PRIVATE";
  }

  return {
    ok: true,
    objectKey,
    vault,
    filename: filenameFromKey(objectKey),
    visibility,
    visibilityAmbiguous,
  };
}
