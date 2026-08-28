import { redirect } from "next/navigation";
import { StudioPlatformShell } from "@/components/studio/StudioPlatformShell";
import { hasAdminAccess } from "@/lib/admin-auth";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const metadata = {
  title: "Studio Publishing · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioPublishingLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasAdminAccess())) {
    redirect("/admin/login?next=/studio/publishing");
  }

  const context = await resolveStudioOpsContext();
  if (!context) {
    redirect("/admin/login?next=/studio/publishing");
  }

  return <StudioPlatformShell context={context}>{children}</StudioPlatformShell>;
}
