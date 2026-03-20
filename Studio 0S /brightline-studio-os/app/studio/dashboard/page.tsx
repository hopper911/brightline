import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { getMissionControl } from "../actions";
import { isDemoMode } from "@/lib/runtime/demo";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";
import { hasWorkspaceProfile } from "@/lib/profile/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio | Bright Line Studio OS",
  description: "Mission control for your photography studio",
};

export default async function DashboardPage() {
  const ctx = await requireWorkspaceContext();
  if (!hasWorkspaceProfile(ctx.workspaceId)) {
    redirect("/onboarding");
  }
  const data = await getMissionControl();
  const demoMode = await isDemoMode();
  return <StudioShell data={data} demoMode={demoMode} />;
}
