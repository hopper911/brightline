import { redirect } from "next/navigation";
import { StudioPlatformShell } from "@/components/studio/StudioPlatformShell";
import { hasAdminAccess } from "@/lib/admin-auth";

export const metadata = {
  title: "Studio Projects · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioProjectsLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasAdminAccess())) {
    redirect("/admin/login?next=/studio/projects");
  }

  const { resolveStudioOpsContext } = await import("@/lib/studio/ops/resolve-context");
  const context = await resolveStudioOpsContext();
  if (!context) {
    redirect("/admin/login?next=/studio/projects");
  }

  return <StudioPlatformShell context={context}>{children}</StudioPlatformShell>;
}
