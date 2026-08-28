import { redirect } from "next/navigation";
import { StudioOpsShell } from "@/components/studio/StudioOpsShell";
import { hasAdminAccess } from "@/lib/admin-auth";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const metadata = {
  title: "Studio Ops · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioOpsLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasAdminAccess())) {
    redirect("/admin/login?next=/studio/ops");
  }

  const context = await resolveStudioOpsContext();
  if (!context) {
    redirect("/admin/login?next=/studio/ops");
  }

  return <StudioOpsShell context={context}>{children}</StudioOpsShell>;
}
