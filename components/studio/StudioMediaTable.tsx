import Link from "next/link";
import type { PlatformAssetRecord } from "@/lib/platform/assets/types";
import { studioAssetDimensions } from "@/lib/studio/media/list-studio-assets";

type Props = {
  tenant: "brightline" | "mirotech";
  items: PlatformAssetRecord[];
  nextCursor?: string;
  partialCoverage: boolean;
};

export function StudioMediaTable({ tenant, items, nextCursor, partialCoverage }: Props) {
  return (
    <div>
      {partialCoverage ? (
        <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/85">
          Registry coverage is partial. Only assets registered in the platform asset registry appear
          here — legacy R2-only objects are not scanned on each request.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-white/60">
          No registry assets for {tenant} yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {items.map((asset) => {
            const dims = studioAssetDimensions(asset.metadata);
            return (
              <li key={asset.id} className="bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/studio/media/${asset.id}`} className="text-base text-white hover:underline">
                      {asset.filename ?? asset.objectKey.split("/").pop() ?? asset.id}
                    </Link>
                    <p className="mt-1 text-xs text-white/45">
                      {asset.mimeType ?? "unknown"} · {asset.visibility.toLowerCase()} · {asset.provider}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/35">{asset.objectKey}</p>
                  </div>
                  <div className="text-right text-xs text-white/45">
                    <p>{asset.vault}</p>
                    {dims.width && dims.height ? (
                      <p>
                        {dims.width}×{dims.height}
                      </p>
                    ) : null}
                    <p>{new Date(asset.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="mt-4">
          <Link
            href={`/studio/media?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-block rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Next page →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
