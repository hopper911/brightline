"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, type SaveOnboardingInput } from "./actions";
import { Panel } from "@/components/studio/Panel";

const BUSINESS_TYPES = ["Architecture", "Corporate", "Residential", "Hospitality", "Product", "Events", "Other"] as const;

const SERVICE_PRESETS = ["Photography", "Video", "Drone", "Floor plans", "Retouching", "Social cutdowns"] as const;

const STYLE_PRESETS = ["Architecture", "Corporate", "Lifestyle", "Editorial", "Luxury", "Minimal", "Bold contrast"] as const;

const GOAL_PRESETS = ["More leads", "Higher-ticket clients", "Faster delivery", "More recurring work", "Stronger portfolio"] as const;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessType, setBusinessType] = useState<string>("");
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [mainLocation, setMainLocation] = useState<string>("");
  const [styleFocus, setStyleFocus] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  const canNext = useMemo(() => {
    if (step === 1) return businessType.trim().length > 0;
    if (step === 2) return servicesOffered.length > 0;
    if (step === 3) return mainLocation.trim().length > 0;
    if (step === 4) return styleFocus.length > 0;
    if (step === 5) return goals.length > 0;
    return false;
  }, [step, businessType, servicesOffered, mainLocation, styleFocus, goals]);

  async function handleFinish() {
    setError(null);
    setSaving(true);
    try {
      const payload: SaveOnboardingInput = {
        businessType: businessType.trim(),
        servicesOffered,
        mainLocation: mainLocation.trim(),
        styleFocus,
        goals,
      };
      await saveOnboarding(payload);
      router.push("/studio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Panel padding="base" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
              Onboarding
            </h2>
            <p className="mt-1 text-sm text-white/55">Step {step} of 5</p>
          </div>
          <div className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
            Workspace profile
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/70">What kind of business do you run?</p>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBusinessType(t)}
                  className={`rounded-studio-base border px-3 py-2 text-sm transition-colors ${
                    businessType === t
                      ? "border-accent/30 bg-accent/15 text-white/90"
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                Or type your own
              </label>
              <input
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="e.g. Architecture photography"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/70">What services do you offer?</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setServicesOffered((s) => toggle(s, t))}
                  className={`rounded-studio-base border px-3 py-2 text-sm transition-colors ${
                    servicesOffered.includes(t)
                      ? "border-accent/30 bg-accent/15 text-white/90"
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40">Pick at least one. You can refine later.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <p className="text-sm text-white/70">What’s your main location?</p>
            <input
              value={mainLocation}
              onChange={(e) => setMainLocation(e.target.value)}
              className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. Miami, New York, Worldwide"
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/70">What style focus best describes you?</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStyleFocus((s) => toggle(s, t))}
                  className={`rounded-studio-base border px-3 py-2 text-sm transition-colors ${
                    styleFocus.includes(t)
                      ? "border-accent/30 bg-accent/15 text-white/90"
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/70">What are your goals for Studio OS?</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGoals((s) => toggle(s, t))}
                  className={`rounded-studio-base border px-3 py-2 text-sm transition-colors ${
                    goals.includes(t)
                      ? "border-accent/30 bg-accent/15 text-white/90"
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-studio-base border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200/90">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || saving}
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              disabled={!canNext || saving}
              className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-accent/15 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canNext || saving}
              className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-accent/15 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Finish"}
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}

