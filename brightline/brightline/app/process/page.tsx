import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Process · Bright Line Photography",
  description:
    "How we work: from inquiry to delivery. A streamlined five-step process for commercial photography projects.",
  alternates: { canonical: "/process" },
};

const STEPS = [
  {
    number: "01",
    title: "Inquiry",
    body: "Share your vision, timeline, and scope. We reply within 24 hours with initial thoughts and availability.",
  },
  {
    number: "02",
    title: "Planning",
    body: "We align on creative direction, shot list, and logistics. A tailored proposal and contract follows.",
  },
  {
    number: "03",
    title: "Shoot",
    body: "On-location or in-studio. We focus on natural light, composition, and capturing the story.",
  },
  {
    number: "04",
    title: "Edit & Delivery",
    body: "Professional retouching and delivery in your preferred formats. Quick turnaround for urgent needs.",
  },
  {
    number: "05",
    title: "Support",
    body: "Ongoing support for usage, revisions, and future projects. We build lasting partnerships.",
  },
];

export default function ProcessPage() {
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Process</p>
        <h1 className="section-title">How we work</h1>
        <p className="section-subtitle">
          A clear, premium workflow from first inquiry to final delivery.
        </p>
      </Reveal>

      <div className="mt-12 space-y-10">
        {STEPS.map((step, i) => (
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

      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center">
          <h2 className="font-display text-2xl text-white">
            Ready to start?
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Share your project and we&apos;ll take it from here.
          </p>
          <Link href="/contact" className="btn btn-solid mt-6">
            Get in touch
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
