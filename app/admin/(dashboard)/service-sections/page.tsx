import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getEditableServicePages } from "@/lib/service-pages";
import ServiceSectionsClient from "./service-sections-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service Sections · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminServiceSectionsPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const services = await getEditableServicePages();
  return <ServiceSectionsClient initialServices={services} />;
}
