import { MetricCard } from "@/components/studio/MetricCard";
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
        <MetricCard key={item.id} label={item.label} value={item.value} hint={item.hint} />
      ))}
    </section>
  );
}
