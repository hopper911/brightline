type Props = {
  children: React.ReactNode;
  className?: string;
};

export function BrowserFrame({ children, className = "" }: Props) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/15 bg-[#0b0e12] shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
      </div>
      <div className="bg-black/40">{children}</div>
    </div>
  );
}

export function MobileFrame({ children, className = "" }: Props) {
  return (
    <div className={`mx-auto w-full max-w-[280px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0b0e12] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="overflow-hidden rounded-[1.35rem] bg-black/40">{children}</div>
    </div>
  );
}

export function ProcessSteps({
  steps,
}: {
  steps: Array<{ title: string; body: string }>;
}) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[0.62rem] uppercase tracking-[0.25em] text-white/40">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 font-display text-lg text-white">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function FeatureCallout({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="font-display text-lg text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
    </div>
  );
}
