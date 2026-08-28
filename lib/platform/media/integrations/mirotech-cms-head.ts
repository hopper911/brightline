import "server-only";

import type { MirotechCmsMediaRef } from "@/lib/admin-r2-mirotech-cms-keys";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";
import type { MediaHeadResult } from "@/lib/platform/media/types";

/** Phase 3F — read-only CMS media metadata lookup (mirotech-site vault). */
export async function headMirotechCmsObjectViaMediaService(
  service: MediaService,
  ref: Pick<MirotechCmsMediaRef, "key" | "vault">
): Promise<MediaHeadResult | null> {
  if (ref.vault !== "mirotech-site") {
    return null;
  }
  const context = createPlatformContextForTenant("mirotech");
  return service.headObject(context, { vault: "mirotech-site", objectKey: ref.key });
}
