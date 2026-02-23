import { CREDIBILITY } from "@/lib/config/credibility";

type ProcessTimelineProps = {
  variant?: "light" | "dark";
};

const STEPS = [
  { title: "Inquiry", desc: "Share your project, timeline, and goals." },
  { title: "Scope & quote", desc: "Tailored proposal within 48 hours." },
  { title: "Shoot", desc: "On-location capture with a clear shot list." },
  {
    title: "Proofs",
    desc: `Initial selects in ${CREDIBILITY?.turnaround?.proofs ?? "5-7 days"}.`,
  },
  {
    title: "Finals",
    desc: `Delivery in ${CREDIBILITY?.turnaround?.finals ?? "10-14 days"}.`,
  },
];

export default function ProcessTimeline({ variant = "dark" }: ProcessTimelineProps) {
  const isDark = variant === "dark";

  return (
    <ol className="space-y-6">
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"
            }`}
          >
            {i + 1}
          </span>
          <div>
            <p className={`font-medium ${isDark ? "text-white" : "text-black"}`}>
              {step.title}
            </p>
            <p className={`mt-0.5 text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
              {step.desc}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
