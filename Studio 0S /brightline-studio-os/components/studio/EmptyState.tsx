interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-studio-xl border border-white/[0.04] bg-white/[0.01] px-6 py-12 text-center ${className}`}
    >
      <div className="mb-4 h-px w-12 bg-white/[0.08]" aria-hidden />
      <p className="font-display text-sm font-medium tracking-[0.15em] text-white/55 uppercase">
        {title}
      </p>
      {description && (
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/40">
          {description}
        </p>
      )}
    </div>
  );
}
