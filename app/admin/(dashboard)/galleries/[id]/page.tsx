import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";
import GalleryDetail from "./gallery-detail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gallery · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminGalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const gallery = await getAdminGalleryDetail(id);

  if (!gallery) notFound();

  const initialGallery = {
    ...gallery,
    createdAt: gallery.createdAt.toISOString(),
    updatedAt: gallery.updatedAt.toISOString(),
    sentAt: gallery.sentAt ? gallery.sentAt.toISOString() : null,
    images: gallery.images.map((i) => ({
      ...i,
    })),
    accessTokens: gallery.accessTokens.map((t) => ({
      ...t,
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      selectionsSubmittedAt: t.selectionsSubmittedAt
        ? t.selectionsSubmittedAt.toISOString()
        : null,
    })),
  };

  return <GalleryDetail initialGallery={initialGallery} />;
}

