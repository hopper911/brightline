import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import BackgroundVideosClient, {
  type BgVideoRow,
} from "./background-videos-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Background videos · Admin",
  robots: { index: false, follow: false },
};

export default async function BackgroundVideosPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  let initialVideos: BgVideoRow[] = [];
  let loadError = "";
  try {
    const rows = await prisma.siteBackgroundVideo.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    initialVideos = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      storageKey: row.storageKey,
      webStorageKey: row.webStorageKey,
      posterKey: row.posterKey,
      sortOrder: row.sortOrder,
      width: row.width,
      height: row.height,
      bytes: row.bytes,
      durationSec: row.durationSec,
      enabled: row.enabled,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load catalog.";
  }

  return <BackgroundVideosClient initialVideos={initialVideos} initialError={loadError} />;
}
