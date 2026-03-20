import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/studio/PageShell";
import { OnboardingWizard } from "./OnboardingWizard";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";
import { getWorkspaceProfile } from "@/lib/profile/store";

export const metadata: Metadata = {
  title: "Onboarding | Bright Line Studio OS",
  description: "Set up your studio workspace",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await requireWorkspaceContext();
  const existing = getWorkspaceProfile(ctx.workspaceId);
  if (existing) {
    redirect("/studio");
  }

  return (
    <PageShell
      title="Welcome to Studio OS"
      subtitle="Answer four quick questions. You’ll see your first workflow and next actions immediately."
      maxWidth="lg"
    >
      <OnboardingWizard />
    </PageShell>
  );
}

