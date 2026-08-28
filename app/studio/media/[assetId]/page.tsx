import Link from "next/link";
import { notFound } from "next/navigation";
import { canReadStudioMedia } from "@/lib/studio/access";
import { getStudioAssetDetail, studioAssetDimensions } from "@/lib/studio/media/list-studio-assets";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

type Props = {
  params: Promise<{ assetId: string }>;
};

export default async function StudioMediaDetailPage({ params }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canReadStudioMedia(context.permissions, legacyAdmin)) {
    notFound();
  }

  const { assetId } = await params;
  const asset = await getStudioAssetDetail(context.activeTenant, assetId);
  if (!asset) {
    notFound();
  }

  const dims = studioAssetDimensions(asset.metadata);

  return (
    <div>
      <Link href="/studio/media" className="text-sm text-white/55 hover:text-white">
        ← Back to media
      </Link>
      <h2 className="mt-4 font-display text-2xl text-white">
        {asset.filename ?? asset.objectKey.split("/").pop()}
      </h2>
      <p className="mt-2 text-sm text-white/55">Read-only asset registry detail</p>

      <dl className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Asset ID</dt>
          <dd className="mt-1 break-all text-white/80">{asset.id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Tenant</dt>
          <dd className="mt-1 text-white/80">{asset.tenantSlug}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Type</dt>
          <dd className="mt-1 text-white/80">{asset.mimeType ?? "unknown"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Visibility</dt>
          <dd className="mt-1 text-white/80">{asset.visibility.toLowerCase()}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Provider</dt>
          <dd className="mt-1 text-white/80">{asset.provider}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Vault</dt>
          <dd className="mt-1 text-white/80">{asset.vault}</dd>
        </div>
        {dims.width && dims.height ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Dimensions</dt>
            <dd className="mt-1 text-white/80">
              {dims.width}×{dims.height}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Created</dt>
          <dd className="mt-1 text-white/80">{new Date(asset.createdAt).toLocaleString()}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-[0.2em] text-white/45">Object key</dt>
          <dd className="mt-1 break-all text-white/70">{asset.objectKey}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-white/40">
        Signed URLs and bucket credentials are not exposed. Use admin R2 tools for delivery URLs.
      </p>
    </div>
  );
}
