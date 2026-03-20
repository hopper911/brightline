import Link from "next/link";

type Props = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function UpgradePrompt({ title, description, ctaLabel, ctaHref }: Props) {
  return (
    <div className="rounded-studio-xl border border-accent-border/30 bg-accent-glow/15 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.3em] text-accent-muted">
            Upgrade
          </p>
          <h2 className="mt-2 font-display text-lg font-medium tracking-tight text-white/95">{title}</h2>
          <p className="mt-2 text-sm text-white/65">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-studio-base border border-accent-border bg-accent/15 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-white/40">
        Billing connection coming soon. Plans are enforced locally today.
      </p>
    </div>
  );
}

