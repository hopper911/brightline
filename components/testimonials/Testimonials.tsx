import { TESTIMONIALS } from "@/lib/testimonials";

export default function Testimonials() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {TESTIMONIALS.map((item) => (
        <div
          key={item.name}
          className="rounded-2xl border border-white/10 bg-[var(--card)] p-6 shadow-sm backdrop-blur-md"
        >
          <p className="font-display text-xl text-white">
            &ldquo;{item.quote}&rdquo;
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/75">
            {item.name}
            {item.role && ` · ${item.role}`}
          </p>
        </div>
      ))}
    </div>
  );
}
