import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getEditableServicePages } from "@/lib/service-pages";
import ServicePagesClient from "./service-pages-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service Pages · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminServicePagesPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const services = await getEditableServicePages();
  return <ServicePagesClient initialServices={services} />;
}
