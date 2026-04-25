import { STRATEGIC_PROCESS_STEPS } from "@/lib/config/strategicPositioning";

type ProcessTimelineProps = {
  variant?: "light" | "dark";
};

export default function ProcessTimeline({ variant = "dark" }: ProcessTimelineProps) {
  const isDark = variant === "dark";
  return (
    <ol className="space-y-6">
      {STRATEGIC_PROCESS_STEPS.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"}`}
          >
            {i + 1}
          </span>
          <div>
            <p className={`font-medium ${isDark ? "text-white" : "text-black"}`}>{step.title}</p>
            <p className={`mt-0.5 text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
