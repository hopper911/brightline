import AssignedPageBackground from "@/components/AssignedPageBackground";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";
import ContactPageClient from "./ContactPageClient";
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from "@/lib/public-page-cache";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

export default async function ContactPage() {
  const published = await getPublishedWebsitePageBySlug("contact");
  const { media, poster } = getBackgroundMediaFromPage(published);

  return (
    <>
      <AssignedPageBackground pageKey="contact" fallbackMedia={media} fallbackPoster={poster} />
      <div className="relative z-[2]">
        <ContactPageClient />
      </div>
    </>
  );
}
