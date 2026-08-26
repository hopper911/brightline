import type { DesignPortfolioStatus } from "@prisma/client";

export const DESIGN_PORTFOLIO_STATUSES = [
  "LIVE_PRODUCT",
  "WORKING_MVP",
  "INTERACTIVE_PROTOTYPE",
  "PRODUCT_CONCEPT",
  "INTERNAL_TOOL",
  "CLIENT_PROJECT",
  "ONGOING",
  "ARCHIVED",
] as const satisfies ReadonlyArray<DesignPortfolioStatus>;

export type DesignPortfolioStatusId = (typeof DESIGN_PORTFOLIO_STATUSES)[number];

export const DESIGN_PORTFOLIO_STATUS_LABEL: Record<DesignPortfolioStatusId, string> = {
  LIVE_PRODUCT: "Live Product",
  WORKING_MVP: "Working MVP",
  INTERACTIVE_PROTOTYPE: "Interactive Prototype",
  PRODUCT_CONCEPT: "Product Concept",
  INTERNAL_TOOL: "Internal Tool",
  CLIENT_PROJECT: "Client Project",
  ONGOING: "Ongoing",
  ARCHIVED: "Archived",
};

export const DESIGN_PORTFOLIO_STATUS_HINT: Record<DesignPortfolioStatusId, string> = {
  LIVE_PRODUCT: "Deployed and in active use.",
  WORKING_MVP: "Usable end-to-end with limited scope.",
  INTERACTIVE_PROTOTYPE: "Clickable prototype; not a full production system.",
  PRODUCT_CONCEPT: "Concept and design work; not deployed.",
  INTERNAL_TOOL: "Used internally by the studio.",
  CLIENT_PROJECT: "Delivered for a client engagement.",
  ONGOING: "Actively evolving.",
  ARCHIVED: "No longer active.",
};

export function isDesignPortfolioStatus(value: unknown): value is DesignPortfolioStatusId {
  return (
    typeof value === "string" &&
    (DESIGN_PORTFOLIO_STATUSES as ReadonlyArray<string>).includes(value)
  );
}

export function normalizeDesignPortfolioStatus(
  value: unknown,
  fallback: DesignPortfolioStatusId = "PRODUCT_CONCEPT"
): DesignPortfolioStatusId {
  return isDesignPortfolioStatus(value) ? value : fallback;
}

export function designPortfolioStatusLabel(status: DesignPortfolioStatusId | string | null | undefined): string {
  if (isDesignPortfolioStatus(status)) return DESIGN_PORTFOLIO_STATUS_LABEL[status];
  return DESIGN_PORTFOLIO_STATUS_LABEL.PRODUCT_CONCEPT;
}
