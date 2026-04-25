import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Gallery · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminGalleryNewPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  // Gallery creation UI currently lives on `/admin/galleries`.
  redirect("/admin/galleries");
}

