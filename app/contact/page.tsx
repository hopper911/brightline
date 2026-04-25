import ContactPageClient from "./ContactPageClient";
import WebsitePageView from "@/components/WebsitePageView";
import { getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const pageOverride = await getPublishedWebsitePageBySlug("contact");
  if (pageOverride) {
    return <WebsitePageView page={pageOverride} />;
  }

  return <ContactPageClient />;
}
