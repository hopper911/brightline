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

function pushCapped(list: PriorityItem[], item: PriorityItem, cap = 8) {
  if (list.length < cap) list.push(item);
}

export function computeStudioPriorities(input: PriorityEngineInput): PriorityEngineOutput {
  const now = input.now ?? new Date();
  const todayFocus: PriorityItem[] = [];
  const risks: PriorityItem[] = [];
  const opportunities: PriorityItem[] = [];
  const suggestions: PriorityItem[] = [];
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
  };
}
