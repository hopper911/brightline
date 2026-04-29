import ClientAccessLanding from "@/components/ClientAccessLanding";
import PageBackground from "@/components/PageBackground";
import { BRAND } from "@/lib/config/brand";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";

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
  const page = await getPublishedWebsitePageBySlug("galleries");
  const { media, poster } = getBackgroundMediaFromPage(page);

  return (
    <>
      <PageBackground media={media} poster={poster} />
      <ClientAccessLanding page={page} />
    </>
  );
}
