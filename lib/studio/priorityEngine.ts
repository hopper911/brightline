import type {
  ClientFollowUpStatus,
  ContentStatus,
  LeadStatus,
  PaymentStatus,
  ProjectStatus,
} from "@prisma/client";

export type PrioritySeverity = "low" | "medium" | "high";
export type PriorityKind = "focus" | "risk" | "opportunity" | "suggestion";

export type PriorityItem = {
  kind: PriorityKind;
  severity: PrioritySeverity;
  title: string;
  detail: string;
  href?: string;
  entityType?: "lead" | "project" | "client" | "finance";
  entityId?: string;
};

export type PriorityLead = {
  id: string;
  name: string;
  company: string | null;
  status: LeadStatus;
  followUpDate: Date | null;
  createdAt: Date;
  convertedProjectId: string | null;
};

export type PriorityProject = {
  id: string;
  title: string;
  slug: string;
  client: string;
  status: ProjectStatus;
  deliveryDate: Date | null;
  updatedAt: Date;
  balanceRemaining: { toString(): string };
  paymentStatus: PaymentStatus;
  contentStatus: ContentStatus;
  contentPosted: boolean;
  reusableLater: boolean;
  isPublicReady: boolean;
  /** For profitability / health scoring (optional for backward compat). */
  totalPrice?: { toString(): string };
  amountPaid?: { toString(): string };
};

export type PriorityClient = {
  id: string;
  companyName: string;
  followUpStatus: ClientFollowUpStatus;
  followUpAt: Date | null;
  projectsCount: number;
};

export type PriorityEmailThread = {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  unread: boolean;
  lastMessageAt: Date;
  matchedClientId: string | null;
  matchedLeadId: string | null;
  matchedProjectId: string | null;
};

export type PriorityEngineInput = {
  now?: Date;
  leads: PriorityLead[];
  projects: PriorityProject[];
  clients: PriorityClient[];
  emailThreads?: PriorityEmailThread[];
};

export type PriorityEngineOutput = {
  todayFocus: PriorityItem[];
  risks: PriorityItem[];
  opportunities: PriorityItem[];
  suggestions: PriorityItem[];
  /** Deterministic 0–100 scores per Studio project id (operational intelligence). */
  projectHealth: Record<string, ProjectHealthScores>;
};

/** Higher is better for health, deliveryReadiness, profitability. Higher productionRisk means more risk. */
export type ProjectHealthScores = {
  health: number;
  productionRisk: number;
  deliveryReadiness: number;
  profitability: number | null;
  factors: {
    editingStallDays: number;
    hasUnpaidBalance: boolean;
    paymentOverdue: boolean;
    nearDelivery: boolean;
    status: ProjectStatus;
  };
};

const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "INQUIRY",
  "PLANNED",
  "SCHEDULED",
  "SHOT",
  "INGESTING",
  "EDITING",
  "PROOF_READY",
  "CLIENT_REVIEWING",
  "FINAL_APPROVED",
  "DELIVERED",
  "CASE_STUDY_DRAFT",
];

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function moneyGtZero(value: { toString(): string }): boolean {
  return Number(value.toString()) > 0;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const MAX_TODAY_FOCUS = 8;

function pushCapped(list: PriorityItem[], item: PriorityItem, max = MAX_TODAY_FOCUS): void {
  if (list.length < max) list.push(item);
}

function moneyNumber(value: { toString(): string } | undefined): number {
  if (!value) return 0;
  return Number(value.toString());
}

/**
 * Rule-based scores derived from Studio OS project state (no LLM).
 */
export function computeProjectHealthScores(
  project: PriorityProject,
  now: Date
): ProjectHealthScores {
  const updatedAge = daysBetween(now, project.updatedAt);
  const deliverySoon =
    project.deliveryDate != null &&
    project.deliveryDate >= now &&
    daysBetween(project.deliveryDate, now) <= 7;
  const editingStallDays = project.status === "EDITING" ? updatedAge : 0;

  let productionRisk = 0;
  if (project.status === "EDITING") {
    productionRisk += Math.min(40, editingStallDays * 3);
  }
  if (project.status === "CLIENT_REVIEWING" && updatedAge >= 10) {
    productionRisk += 20;
  }
  if (project.status === "INQUIRY" && updatedAge >= 21) {
    productionRisk += 25;
  }
  if (project.status === "PLANNED" && updatedAge >= 30) {
    productionRisk += 15;
  }
  productionRisk = clampScore(productionRisk);

  let deliveryReadiness = 40;
  switch (project.status) {
    case "DELIVERED":
    case "PUBLISHED":
      deliveryReadiness = 100;
      break;
    case "CASE_STUDY_DRAFT":
      deliveryReadiness = 92;
      break;
    case "FINAL_APPROVED":
      deliveryReadiness = 88;
      break;
    case "CLIENT_REVIEWING":
      deliveryReadiness = 72;
      break;
    case "PROOF_READY":
      deliveryReadiness = 64;
      break;
    case "EDITING":
    case "INGESTING":
      deliveryReadiness = 48;
      break;
    case "SHOT":
    case "SCHEDULED":
      deliveryReadiness = 36;
      break;
    case "PLANNED":
    case "INQUIRY":
      deliveryReadiness = 28;
      break;
    case "ARCHIVED":
      deliveryReadiness = 20;
      break;
    default:
      deliveryReadiness = 40;
  }
  if (deliverySoon && project.status !== "DELIVERED" && project.status !== "PUBLISHED") {
    deliveryReadiness = clampScore(deliveryReadiness + 12);
  }
  deliveryReadiness = clampScore(deliveryReadiness);

  const hasUnpaidBalance = moneyGtZero(project.balanceRemaining);
  const paymentOverdue = project.paymentStatus === "OVERDUE";

  let profitability: number | null = null;
  const total = moneyNumber(project.totalPrice);
  const paid = moneyNumber(project.amountPaid);
  if (total > 0) {
    profitability = clampScore((paid / total) * 100);
    if (paymentOverdue) profitability = clampScore((profitability ?? 0) - 25);
    else if (hasUnpaidBalance && project.status === "DELIVERED") {
      profitability = clampScore((profitability ?? 0) - 12);
    }
  }

  let health = 100;
  health -= productionRisk * 0.45;
  if (paymentOverdue) health -= 22;
  else if (hasUnpaidBalance && (project.status === "DELIVERED" || project.status === "FINAL_APPROVED")) {
    health -= 12;
  }
  health += (deliveryReadiness - 50) * 0.12;
  if (profitability != null) {
    health += (profitability - 70) * 0.08;
  }
  health = clampScore(health);

  return {
    health,
    productionRisk,
    deliveryReadiness,
    profitability,
    factors: {
      editingStallDays,
      hasUnpaidBalance,
      paymentOverdue,
      nearDelivery: deliverySoon,
      status: project.status,
    },
  };
}


export function computeStudioPriorities(input: PriorityEngineInput): PriorityEngineOutput {
  const now = input.now ?? new Date();
  const todayFocus: PriorityItem[] = [];
  const risks: PriorityItem[] = [];
  const opportunities: PriorityItem[] = [];
  const suggestions: PriorityItem[] = [];
  const projectHealth: Record<string, ProjectHealthScores> = {};
  const emailThreads = input.emailThreads ?? [];

  for (const thread of emailThreads) {
    if (!thread.unread) continue;
    const sender = thread.fromName || thread.fromEmail || "client";
    const href = thread.matchedLeadId
      ? `/admin/studio-leads/${thread.matchedLeadId}`
      : thread.matchedClientId
        ? `/admin/clients/${thread.matchedClientId}`
        : thread.matchedProjectId
          ? `/admin/projects/${thread.matchedProjectId}/edit`
          : "/studio";
    pushCapped(todayFocus, {
      kind: "focus",
      severity: "medium",
      title: `Reply to ${sender}`,
      detail: thread.subject,
      href,
      entityType: thread.matchedProjectId ? "project" : thread.matchedLeadId ? "lead" : "client",
      entityId: thread.matchedProjectId ?? thread.matchedLeadId ?? thread.matchedClientId ?? thread.id,
    });
  }

  for (const lead of input.leads) {
    const followUpDue = lead.followUpDate ? lead.followUpDate <= now : false;
    const isUnanswered = lead.status === "NEW" || lead.status === "FOLLOW_UP_NEEDED";
    if (!lead.convertedProjectId && (isUnanswered || followUpDue)) {
      pushCapped(todayFocus, {
        kind: "focus",
        severity: followUpDue ? "high" : "medium",
        title: `Reply to ${lead.company ?? lead.name}`,
        detail: followUpDue ? "Follow-up date is due." : "Lead needs review or reply.",
        href: `/admin/studio-leads/${lead.id}`,
        entityType: "lead",
        entityId: lead.id,
      });
    }
  }

  const editingProjects = input.projects.filter((project) => project.status === "EDITING");
  if (editingProjects.length >= 4) {
    risks.push({
      kind: "risk",
      severity: "medium",
      title: "Editing backlog is building",
      detail: `${editingProjects.length} projects are currently in editing.`,
      href: "/studio",
      entityType: "project",
    });
  }

  for (const project of input.projects) {
    projectHealth[project.id] = computeProjectHealthScores(project, now);
    const projectHref = `/admin/projects/${project.id}/edit`;
    const updatedAge = daysBetween(now, project.updatedAt);
    const deliverySoon =
      project.deliveryDate != null &&
      project.deliveryDate >= now &&
      daysBetween(project.deliveryDate, now) <= 7;

    if (ACTIVE_PROJECT_STATUSES.includes(project.status) && deliverySoon) {
      pushCapped(todayFocus, {
        kind: "focus",
        severity: "medium",
        title: `Delivery approaching: ${project.title}`,
        detail: `Delivery date is ${project.deliveryDate?.toLocaleDateString()}.`,
        href: projectHref,
        entityType: "project",
        entityId: project.id,
      });
    }

    if (project.status === "EDITING" && updatedAge >= 7) {
      const item = {
        kind: "risk" as const,
        severity: updatedAge >= 14 ? "high" as const : "medium" as const,
        title: `Editing stalled: ${project.title}`,
        detail: `No project update in ${updatedAge} days.`,
        href: projectHref,
        entityType: "project" as const,
        entityId: project.id,
      };
      pushCapped(todayFocus, item);
      risks.push(item);
    }

    if (
      moneyGtZero(project.balanceRemaining) &&
      (project.paymentStatus === "OVERDUE" ||
        project.status === "DELIVERED" ||
        project.status === "FINAL_APPROVED" ||
        project.status === "PUBLISHED")
    ) {
      const item = {
        kind: "risk" as const,
        severity: project.paymentStatus === "OVERDUE" ? "high" as const : "medium" as const,
        title: `Payment outstanding: ${project.title}`,
        detail: `$${Number(project.balanceRemaining.toString()).toLocaleString()} still unpaid.`,
        href: "/studio/finance",
        entityType: "finance" as const,
        entityId: project.id,
      };
      pushCapped(todayFocus, item);
      risks.push(item);
    }

    if (
      !project.contentPosted &&
      (project.contentStatus === "READY_TO_POST" ||
        project.contentStatus === "WEBSITE_COPY_DRAFTED" ||
        project.isPublicReady)
    ) {
      opportunities.push({
        kind: "opportunity",
        severity: "medium",
        title: `Marketing-ready project: ${project.title}`,
        detail: "Content is ready or nearly ready but has not been posted.",
        href: projectHref,
        entityType: "project",
        entityId: project.id,
      });
    }

    if (project.status === "DELIVERED" && project.reusableLater) {
      suggestions.push({
        kind: "suggestion",
        severity: "low",
        title: `Reuse opportunity: ${project.title}`,
        detail: "Marked reusable later. Consider adding it to the content queue.",
        href: projectHref,
        entityType: "project",
        entityId: project.id,
      });
    }

    if (project.status === "DELIVERED" && project.deliveryDate) {
      const deliveredAge = daysBetween(now, project.deliveryDate);
      const hasFollowUpEmail = emailThreads.some(
        (thread) =>
          thread.matchedProjectId === project.id &&
          thread.lastMessageAt >= project.deliveryDate!
      );
      if (deliveredAge >= 7 && !hasFollowUpEmail) {
        suggestions.push({
          kind: "suggestion",
          severity: "low",
          title: `Send delivery follow-up: ${project.title}`,
          detail: "Delivered more than 7 days ago with no synced follow-up email.",
          href: projectHref,
          entityType: "project",
          entityId: project.id,
        });
      }
    }
  }

  for (const client of input.clients) {
    const followUpDue = client.followUpAt ? client.followUpAt <= now : false;
    if (client.projectsCount > 1 && (client.followUpStatus === "NONE" || followUpDue)) {
      opportunities.push({
        kind: "opportunity",
        severity: followUpDue ? "medium" : "low",
        title: `Follow up with repeat client: ${client.companyName}`,
        detail: `${client.projectsCount} past projects and no completed follow-up.`,
        href: `/admin/clients/${client.id}`,
        entityType: "client",
        entityId: client.id,
      });
    }
  }

  return {
    todayFocus,
    risks: risks.slice(0, 8),
    opportunities: opportunities.slice(0, 8),
    suggestions: suggestions.slice(0, 8),
    projectHealth,
  };
}
