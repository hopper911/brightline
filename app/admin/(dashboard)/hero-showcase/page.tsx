import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getWebsitePagesForAdmin } from "@/lib/website-pages";
import HeroShowcaseClient from "./hero-showcase-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hero Showcase · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminHeroShowcasePage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const pages = await getWebsitePagesForAdmin();
  return <HeroShowcaseClient initialPages={pages} />;
}
