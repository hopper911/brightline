import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { hasAdminAccess } from "@/lib/admin-auth";
import { inferVaultFromPrefix, isR2VaultId, type R2VaultId } from "@/lib/r2-vaults-shared";
import { parseUploadDestinationFromSearch } from "@/lib/r2-upload-destination";

const R2ManagerClient = dynamic(() => import("./r2-manager-client"), {
  loading: () => (
    <div className="p-8 text-sm text-white/60">Loading media library…</div>
  ),
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "R2 storage · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

type KindFilter = "all" | "image" | "video" | "other";
export type UnifiedMediaView = "brightline-all-media" | "mirotech-all-media";

function parseKindFilter(value: string | undefined): KindFilter {
  if (value === "image" || value === "video" || value === "other") return value;
  return "all";
}

function resolveInitialView(
  vault: R2VaultId,
  viewParam: string | undefined,
  hasPrefix: boolean
): UnifiedMediaView | "folder" {
  if (viewParam === "brightline-all-media" || viewParam === "mirotech-all-media") {
    return viewParam;
  }
  if (viewParam === "folder" || hasPrefix) {
    return "folder";
  }
  return vault === "mirotech-site" ? "mirotech-all-media" : "brightline-all-media";
}

function resolveInitialVault(
  vaultParam: string | undefined,
  viewParam: string | undefined,
  prefix: string
): R2VaultId {
  const clean = prefix.trim().replace(/^\/+/, "");
  const inferred = inferVaultFromPrefix(clean ? (clean.endsWith("/") ? clean : `${clean}/`) : "");
  if (inferred) return inferred;
  if (viewParam === "mirotech-all-media") return "mirotech-site";
  if (viewParam === "brightline-all-media") return "brightline";
  return isR2VaultId(vaultParam) ? vaultParam : "brightline";
}

export default async function AdminR2Page({
  searchParams,
}: {
  searchParams?: Promise<{
    prefix?: string;
    vault?: string;
    mode?: string;
    kind?: string;
    view?: string;
    upload?: string;
    root?: string;
    segment?: string;
    pillar?: string;
    quality?: string;
  }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");
  const params = searchParams ? await searchParams : {};
  const initialPrefix =
    typeof params.prefix === "string" ? params.prefix : "";
  const viewParam = typeof params.view === "string" ? params.view : undefined;
  const initialVault = resolveInitialVault(
    typeof params.vault === "string" ? params.vault : undefined,
    viewParam,
    initialPrefix
  );
  const initialMode = params.mode === "encode" ? ("encode" as const) : undefined;
  const initialKindFilter = parseKindFilter(params.kind);
  const initialView = resolveInitialView(
    initialVault,
    viewParam,
    Boolean(initialPrefix)
  );
  const initialUploadOpen = params.upload === "1" || params.upload === "true";
  const initialUploadDest = parseUploadDestinationFromSearch({
    root: params.root,
    segment: params.segment,
    pillar: params.pillar,
    quality: params.quality,
  });
  return (
    <R2ManagerClient
      initialPrefix={initialPrefix}
      initialVault={initialVault}
      initialMode={initialMode}
      initialKindFilter={initialKindFilter}
      initialView={initialView}
      initialUploadOpen={initialUploadOpen}
      initialUploadDest={initialUploadDest}
    />
  );
}
