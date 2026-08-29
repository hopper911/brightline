import AssignedPageBackground from "@/components/AssignedPageBackground";
import ClientAccessLanding from "@/components/ClientAccessLanding";
import { BRAND } from "@/lib/config/brand";
import {
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from "@/lib/public-page-cache";
  getBackgroundMediaFromPage,
  getWebsitePagesForAdmin,
} from "@/lib/website-pages";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

export const metadata = {
  title: `Client Galleries · ${BRAND.name}`,
  description:
    "Private BRIGHTLINE client gallery access for proofing, image downloads, and video delivery.",
  alternates: { canonical: "/galleries" },
  openGraph: {
    title: `Client Galleries · ${BRAND.name}`,
    description:
      "Private BRIGHTLINE client gallery access for proofing and delivery.",
    url: "/galleries",
  },
  robots: { index: false, follow: false },
};

export default async function GalleriesPage() {
  const allPages = await getWebsitePagesForAdmin();
  const publishedPage =
    allPages.find((p) => p.slug === "galleries" && p.status === "PUBLISHED") ?? null;
  const mergedGalleries = allPages.find((p) => p.slug === "galleries") ?? null;
  const publishedHome = allPages.find((p) => p.slug === "home" && p.status === "PUBLISHED") ?? null;

  let { media, poster } = getBackgroundMediaFromPage(publishedPage);
  if (!media?.trim()) {
    const fromMerged = getBackgroundMediaFromPage(mergedGalleries);
    media = fromMerged.media;
    poster = fromMerged.poster;
  }
  if (!media?.trim()) {
    const fromHome = getBackgroundMediaFromPage(publishedHome);
    media = fromHome.media;
    poster = fromHome.poster;
  }

  return (
    <>
      <AssignedPageBackground pageKey="galleries" fallbackMedia={media} fallbackPoster={poster} />
      <ClientAccessLanding page={publishedPage} />
    </>
  );
}
