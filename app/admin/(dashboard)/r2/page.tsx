import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import R2ManagerClient from "./r2-manager-client";
import { isR2VaultId } from "@/lib/r2-vaults";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "R2 storage · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

type KindFilter = "all" | "image" | "video" | "other";

function parseKindFilter(value: string | undefined): KindFilter {
  if (value === "image" || value === "video" || value === "other") return value;
  return "all";
}

export default async function AdminR2Page({
  searchParams,
}: {
  searchParams?: Promise<{ prefix?: string; vault?: string; mode?: string; kind?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");
  const params = searchParams ? await searchParams : {};
  const initialPrefix =
    typeof params.prefix === "string" ? params.prefix : "";
  const initialVault = isR2VaultId(params.vault) ? params.vault : "brightline";
  const initialMode = params.mode === "encode" ? ("encode" as const) : undefined;
  const initialKindFilter = parseKindFilter(params.kind);
  return (
    <R2ManagerClient
      initialPrefix={initialPrefix}
      initialVault={initialVault}
      initialMode={initialMode}
      initialKindFilter={initialKindFilter}
    />
  );
}
