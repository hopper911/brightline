import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getWebsitePagesForAdmin } from "@/lib/website-pages";
import { getSiteTheme } from "@/lib/site-theme";
import { getSiteNav } from "@/lib/site-nav";
import WebsitePagesClient from "./website-pages-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Website Pages · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePagesPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const pages = await getWebsitePagesForAdmin();
  const theme = await getSiteTheme();
  const nav = await getSiteNav();
  return <WebsitePagesClient initialPages={pages} initialTheme={theme} initialNav={nav} />;
}
