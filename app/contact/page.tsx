import PageBackground from "@/components/PageBackground";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";
import ContactPageClient from "./ContactPageClient";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const published = await getPublishedWebsitePageBySlug("contact");
  const { media, poster } = getBackgroundMediaFromPage(published);

  return (
    <>
      <PageBackground media={media} poster={poster} />
      <div className="relative z-[2]">
        <ContactPageClient />
      </div>
    </>
  );
}
