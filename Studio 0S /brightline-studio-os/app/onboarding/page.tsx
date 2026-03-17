import Link from "next/link";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata = {
  title: "Onboarding | Bright Line Studio OS",
  description: "Set up your workspace profile",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-studio-bg p-6 text-white sm:p-8">
      <div className="mx-auto max-w-xl">
        <Link
          href="/studio"
          className="text-xs font-medium uppercase tracking-[0.1em] text-white/45 transition-colors hover:text-white/70"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-[1.75rem]">
          Workspace onboarding
        </h1>
        <p className="mt-2 text-sm text-white/55">
          A few quick answers so Studio OS can personalize workflows, summaries, and limits.
        </p>
        <OnboardingWizard />
      </div>
    </div>
  );
}

