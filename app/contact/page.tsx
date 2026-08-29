import AssignedPageBackground from "@/components/AssignedPageBackground";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";
import ContactPageClient from "./ContactPageClient";

export const revalidate = 60;

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
