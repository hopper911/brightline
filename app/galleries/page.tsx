import ClientAccessLanding from "@/components/ClientAccessLanding";
import PageBackground from "@/components/PageBackground";
import { BRAND } from "@/lib/config/brand";
import {
  getBackgroundMediaFromPage,
  getWebsitePagesForAdmin,
} from "@/lib/website-pages";

export const dynamic = "force-dynamic";

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
      <PageBackground media={media} poster={poster} />
      <ClientAccessLanding page={publishedPage} />
    </>
  );
}
