interface MetricCardProps {
  label: string;
  value: number | string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div
      className="group rounded-studio-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition-[border-color,background-color] duration-180 hover:border-accent-border hover:bg-white/[0.035]"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-medium tracking-tight text-white/95">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>
      )}
    </div>
  );
}
