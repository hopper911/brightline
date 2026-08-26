import type { Metadata } from "next";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import { STRATEGIC_PROCESS_STEPS_DETAIL } from "@/lib/config/strategicPositioning";

export const metadata: Metadata = {
  title: "Process · BRIGHTLINE Photography",
  description:
    "Capture, structure, optimize, activate—how BRIGHTLINE delivers premium photography with structured, business-ready handoffs.",
  alternates: { canonical: "/process" },
};

export default function ProcessPage() {
  return (
    <>
      <AssignedPageBackground pageKey="process" />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Process</p>
        <h1 className="section-title">How we work</h1>
        <p className="section-subtitle">
          From capture to activation—photography with a systemized delivery workflow behind every project.
        </p>
      </Reveal>

      <div className="mt-12 space-y-10">
        {STRATEGIC_PROCESS_STEPS_DETAIL.map((step) => (
          <Reveal key={step.number}>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-6 md:flex-row md:items-start md:gap-8">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                {step.number}
              </span>
              <div>
                <h2 className="font-display text-xl text-white">{step.title}</h2>
                <p className="mt-2 text-sm text-white/70">{step.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
    </>
  );
}
