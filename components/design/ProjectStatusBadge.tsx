import type { DesignPortfolioStatusId } from "@/lib/design/status";
import { designPortfolioStatusLabel, DESIGN_PORTFOLIO_STATUS_HINT } from "@/lib/design/status";

type Props = {
  status: DesignPortfolioStatusId | string;
  className?: string;
};

export default function ProjectStatusBadge({ status, className = "" }: Props) {
  const label = designPortfolioStatusLabel(status);
  const hint =
    status in DESIGN_PORTFOLIO_STATUS_HINT
      ? DESIGN_PORTFOLIO_STATUS_HINT[status as DesignPortfolioStatusId]
      : undefined;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[0.62rem] uppercase tracking-[0.22em] text-white/75 ${className}`}
      title={hint}
    >
      {label}
    </span>
  );
}
