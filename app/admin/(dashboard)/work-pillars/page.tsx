import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getWorkPillarList } from "@/lib/work-pillar-settings";
import WorkPillarsClient from "./work-pillars-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Work pillars · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminWorkPillarsPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const initialPillars = await getWorkPillarList();
  return <WorkPillarsClient initialPillars={initialPillars} />;
}
