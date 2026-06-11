import type { ProjectStatus } from "@prisma/client";

/**
 * Client-safe production copy for delivery / gallery surfaces.
 * Does not expose internal enum names or operational task detail.
 */

const CLIENT_STATUS_HEADLINE: Record<ProjectStatus, string> = {
  INQUIRY: "We're aligning on scope",
  PLANNED: "Your project is scheduled",
  SCHEDULED: "We're preparing for your shoot",
  SHOT: "We're processing your imagery",
  INGESTING: "We're organizing selects",
  EDITING: "We're refining your proofs",
  PROOF_READY: "Your proofs are being prepared",
  CLIENT_REVIEWING: "We're ready for your feedback",
  FINAL_APPROVED: "We're preparing final delivery",
  DELIVERED: "Your imagery has been delivered",
  CASE_STUDY_DRAFT: "We're preparing story materials",
  PUBLISHED: "Your project story is live",
  ARCHIVED: "This project is complete",
};

const CLIENT_STATUS_DETAIL: Record<ProjectStatus, string> = {
  INQUIRY:
    "Bright Line is confirming creative direction, timing, and deliverables before production.",
  PLANNED: "Dates and creative pillars are confirmed; you'll receive next steps before the shoot.",
  SCHEDULED:
    "Production is on the calendar. You do not need to watch internal timelines — we'll guide you at each step.",
  SHOT: "Imagery is captured. The team is moving into processing — no action needed from you right now.",
  INGESTING: "We're curating the strongest frames from your shoot for the next review round.",
  EDITING: "Color, finish, and polish are in progress. When proofs are ready, you'll receive a clear review link.",
  PROOF_READY: "You'll receive a private proofing experience to leave precise notes — not a raw folder drop.",
  CLIENT_REVIEWING: "Please share feedback on proofs so we can lock your finals.",
  FINAL_APPROVED: "Your selects are approved; we're assembling final files and delivery package details.",
  DELIVERED: "Final files and usage guidance are available in your delivery experience.",
  CASE_STUDY_DRAFT: "We're drafting long-form story materials — this does not affect your delivery files.",
  PUBLISHED: "Select story elements may appear on our channels according to your license.",
  ARCHIVED: "This engagement is wrapped — reach out anytime for future phases.",
};

const PACKAGE_STATUS_CLIENT: Record<string, { headline: string; detail: string }> = {
  draft: {
    headline: "Your delivery package is being prepared",
    detail: "Files and usage notes are still being assembled. You will receive an email when everything is ready to view.",
  },
  preparing: {
    headline: "We're finishing your delivery package",
    detail: "Exports and captions are being finalized. No action is required from you yet.",
  },
  prepared: {
    headline: "Your delivery package is nearly ready",
    detail: "We're doing a final review before sharing your private link.",
  },
  ready_for_review: {
    headline: "Review requested",
    detail: "Please use the proofing tools on this page if notes are needed before final files are locked.",
  },
  sent: {
    headline: "Your delivery is live",
    detail: "You can download, review usage guidance, and complete any payment steps linked here.",
  },
  viewed: {
    headline: "Thanks for opening your delivery",
    detail: "Downloads and invoice steps (if any) remain available on this page.",
  },
  delivered: {
    headline: "Delivery complete",
    detail: "Final materials are available per your license. Keep this link for your records.",
  },
  approved: {
    headline: "Selections approved",
    detail: "Thank you — finals are aligned to your feedback.",
  },
  archived: {
    headline: "This delivery link is archived",
    detail: "Reach out if you need materials restored or a new package issued.",
  },
};

export function clientFacingProductionBlock(status: ProjectStatus): { headline: string; detail: string } {
  return {
    headline: CLIENT_STATUS_HEADLINE[status] ?? "Your project is in progress",
    detail: CLIENT_STATUS_DETAIL[status] ?? "Bright Line will guide you at each milestone.",
  };
}

export function clientFacingPackageMilestone(status: string | null | undefined): {
  headline: string;
  detail: string;
} {
  const key = (status ?? "draft").toLowerCase();
  return (
    PACKAGE_STATUS_CLIENT[key] ?? {
      headline: "Your delivery package",
      detail: "Use the tools on this page for downloads and any linked payment steps.",
    }
  );
}
