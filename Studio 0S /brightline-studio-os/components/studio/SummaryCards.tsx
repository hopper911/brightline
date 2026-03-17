import type { SummaryMetric } from "@/lib/studio/mockData";

interface SummaryCardsProps {
  items: SummaryMetric[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <section
      aria-label="Studio summary metrics"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-violet-500/20 hover:bg-white/[0.04]"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
            {item.label}
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-white">
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-0.5 text-[11px] text-white/45">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
