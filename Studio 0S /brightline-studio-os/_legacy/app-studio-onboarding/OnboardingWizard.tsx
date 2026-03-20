"use client";

import { useMemo, useState, useTransition } from "react";
import { submitOnboarding } from "./actions";
import { Panel } from "@/components/studio/Panel";

type PhotographyType = "architecture" | "real_estate" | "corporate" | "events" | "mixed";
type MainGoal = "get_more_clients" | "streamline_workflow" | "scale_business";

const PHOTO_TYPES: { id: PhotographyType; label: string; description: string }[] = [
  { id: "architecture", label: "Architecture", description: "Buildings, interiors, design-led work" },
  { id: "real_estate", label: "Real estate", description: "Listings, agents, developers, rentals" },
  { id: "corporate", label: "Corporate", description: "Headshots, office, brand, teams" },
  { id: "events", label: "Events", description: "Conferences, galas, nightlife, launches" },
  { id: "mixed", label: "Mixed", description: "A blend — you want a flexible system" },
];

const MAIN_GOALS: { id: MainGoal; label: string; description: string }[] = [
  { id: "get_more_clients", label: "Get more clients", description: "More leads, stronger follow-up, better positioning" },
  { id: "streamline_workflow", label: "Streamline workflow", description: "Less chaos: checklists, handoffs, and consistency" },
  { id: "scale_business", label: "Scale business", description: "More projects without adding stress" },
];

const SERVICE_OPTIONS: Record<PhotographyType, { id: string; label: string }[]> = {
  architecture: [
    { id: "interior_photography", label: "Interior photography" },
    { id: "exterior_photography", label: "Exterior photography" },
    { id: "detail_shots", label: "Detail shots" },
    { id: "twilight_exteriors", label: "Twilight exteriors" },
    { id: "site_progress", label: "Site progress" },
    { id: "retouching", label: "Retouching" },
  ],
  real_estate: [
    { id: "listing_photos", label: "Listing photos" },
    { id: "twilight", label: "Twilight photos" },
    { id: "floor_plans", label: "Floor plans" },
    { id: "drone", label: "Drone" },
    { id: "video_walkthrough", label: "Video walkthrough" },
    { id: "virtual_staging", label: "Virtual staging" },
  ],
  corporate: [
    { id: "headshots", label: "Headshots" },
    { id: "team_photos", label: "Team photos" },
    { id: "office_interiors", label: "Office interiors" },
    { id: "brand_story", label: "Brand story / lifestyle" },
    { id: "event_coverage", label: "Corporate event coverage" },
    { id: "retouching", label: "Retouching" },
  ],
  events: [
    { id: "event_coverage", label: "Event coverage" },
    { id: "step_and_repeat", label: "Step & repeat" },
    { id: "speaker_portraits", label: "Speaker portraits" },
    { id: "recap_delivery", label: "Same-day recap delivery" },
    { id: "social_clips", label: "Social clips" },
    { id: "retouching", label: "Retouching" },
  ],
  mixed: [
    { id: "headshots", label: "Headshots" },
    { id: "interiors", label: "Interiors" },
    { id: "events", label: "Events" },
    { id: "product", label: "Product" },
    { id: "retouching", label: "Retouching" },
    { id: "video", label: "Video" },
  ],
};

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2" aria-label={`Step ${step} of ${total}`}>
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i + 1 === step;
          const isDone = i + 1 < step;
          return (
            <span
              key={i}
              className={`h-1.5 w-10 rounded-full ${
                isActive ? "bg-accent/80" : isDone ? "bg-white/30" : "bg-white/10"
              }`}
            />
          );
        })}
      </div>
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
        Step {step}/{total}
      </span>
    </div>
  );
}

function SelectCard(props: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-studio-xl border px-5 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
        props.selected
          ? "border-accent/40 bg-accent/10"
          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-base font-medium text-white/95">{props.title}</div>
          <div className="mt-1 text-sm text-white/55">{props.description}</div>
        </div>
        <span
          className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            props.selected ? "border-accent/50 bg-accent/20" : "border-white/[0.12] bg-white/[0.02]"
          }`}
          aria-hidden="true"
        >
          <span className={`h-2 w-2 rounded-full ${props.selected ? "bg-accent" : "bg-transparent"}`} />
        </span>
      </div>
    </button>
  );
}

function CheckboxPill(props: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
        props.checked ? "border-accent/40 bg-accent/10 text-white/90" : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.03]"
      }`}
      aria-pressed={props.checked}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
          props.checked ? "border-accent/50 bg-accent/20" : "border-white/[0.12] bg-white/[0.02]"
        }`}
        aria-hidden="true"
      >
        <span className={`h-2 w-2 rounded-sm ${props.checked ? "bg-accent" : "bg-transparent"}`} />
      </span>
      {props.label}
    </button>
  );
}

export function OnboardingWizard() {
  const totalSteps = 4;
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [photographyType, setPhotographyType] = useState<PhotographyType | null>(null);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [mainLocation, setMainLocation] = useState("");
  const [mainGoal, setMainGoal] = useState<MainGoal | null>(null);

  const serviceOptions = useMemo(() => {
    if (!photographyType) return [];
    return SERVICE_OPTIONS[photographyType];
  }, [photographyType]);

  function canGoNext(): boolean {
    if (step === 1) return photographyType !== null;
    if (step === 2) return servicesOffered.length > 0;
    if (step === 3) return mainLocation.trim().length >= 2;
    if (step === 4) return mainGoal !== null;
    return false;
  }

  function next() {
    setError(null);
    if (!canGoNext()) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function toggleService(id: string) {
    setServicesOffered((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setError(null);
    if (!photographyType || !mainGoal) return;
    const location = mainLocation.trim();
    if (location.length < 2) {
      setError("Please enter your location.");
      setStep(3);
      return;
    }

    startTransition(async () => {
      try {
        await submitOnboarding({
          photographyType,
          servicesOffered,
          mainLocation: location,
          mainGoal,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
        setError(message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Stepper step={step} total={totalSteps} />
        <div className="text-sm text-white/50">
          <span className="text-white/80">Goal:</span> show your first workflow in under 2 minutes.
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-studio-xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-200"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <Panel padding="lg" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium text-white/95">What type of photography do you do?</h2>
            <p className="mt-1 text-sm text-white/55">This helps Studio OS tune workflows and recommendations.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PHOTO_TYPES.map((t) => (
              <SelectCard
                key={t.id}
                title={t.label}
                description={t.description}
                selected={photographyType === t.id}
                onClick={() => {
                  setPhotographyType(t.id);
                  setServicesOffered([]);
                }}
              />
            ))}
          </div>
        </Panel>
      )}

      {step === 2 && (
        <Panel padding="lg" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium text-white/95">What services do you offer?</h2>
            <p className="mt-1 text-sm text-white/55">Select all that apply.</p>
          </div>
          {photographyType ? (
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((s) => (
                <CheckboxPill
                  key={s.id}
                  label={s.label}
                  checked={servicesOffered.includes(s.id)}
                  onToggle={() => toggleService(s.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/55">Choose a photography type first.</div>
          )}
          <div className="text-xs text-white/40">Selected: {servicesOffered.length}</div>
        </Panel>
      )}

      {step === 3 && (
        <Panel padding="lg" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium text-white/95">Where are you based?</h2>
            <p className="mt-1 text-sm text-white/55">Example: “Miami, FL” or “New York City”.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/45" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              value={mainLocation}
              onChange={(e) => setMainLocation(e.target.value)}
              placeholder="City, State / Region"
              className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </Panel>
      )}

      {step === 4 && (
        <Panel padding="lg" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-medium text-white/95">What is your main goal?</h2>
            <p className="mt-1 text-sm text-white/55">We’ll bias suggestions toward the outcome you care about most.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MAIN_GOALS.map((g) => (
              <SelectCard
                key={g.id}
                title={g.label}
                description={g.description}
                selected={mainGoal === g.id}
                onClick={() => setMainGoal(g.id)}
              />
            ))}
          </div>
        </Panel>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={back}
          disabled={pending || step === 1}
          className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-xs text-white/40">
            {step < totalSteps ? "Next: " : "Finish: "}
            <span className="text-white/70">
              {step === 1 ? "services" : step === 2 ? "location" : step === 3 ? "main goal" : "welcome dashboard"}
            </span>
          </div>
          {step < totalSteps ? (
            <button
              type="button"
              onClick={next}
              disabled={pending || !canGoNext()}
              className="rounded-studio-base bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-muted disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !canGoNext()}
              className="rounded-studio-base bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-muted disabled:opacity-50"
            >
              {pending ? "Setting up…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

