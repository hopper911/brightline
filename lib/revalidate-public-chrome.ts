import { revalidateTag } from "next/cache";

import { PUBLIC_CHROME_CACHE_TAG } from "@/lib/public-chrome-cache";

/** Invalidate cross-request public chrome cache after admin CMS saves. */
export function revalidatePublicChrome(): void {
  revalidateTag(PUBLIC_CHROME_CACHE_TAG);
}
