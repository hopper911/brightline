import { TESTIMONIALS } from "@/lib/testimonials";

export default function Testimonials() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {TESTIMONIALS.map((item) => (
        <div
          key={item.name}
          className="rounded-2xl border border-black/10 bg-white/80 p-6"
        >
          <p className="font-display text-xl text-black">
            &ldquo;{item.quote}&rdquo;
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-black/60">
            {item.name}
            {item.role && ` · ${item.role}`}
          </p>
        </div>
      ))}
    </div>
  );
}
