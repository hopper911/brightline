import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getEditableServicePages } from "@/lib/service-pages";
import WorkSectionsClient from "./work-sections-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Work Sections · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminWorkSectionsPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const services = await getEditableServicePages();
  return <WorkSectionsClient initialServices={services} />;
}
