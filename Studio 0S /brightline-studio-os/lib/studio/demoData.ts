import type { SummaryMetric } from "@/lib/studio/mockData";

type DemoProject = {
  id: string;
  name: string;
  client: string | null;
  type: string | null;
  status: string | null;
  location: string | null;
  shootDate: string | null;
};

type DemoDraft = {
  id: string;
  type: string;
  room: string;
  content: string;
  createdAt: string;
  projectId?: string;
};

type DemoEvent = {
  id: string;
  room: string;
  projectId: string | null;
  agent: string;
  type: string;
  status: string;
  summary: string;
  createdAt: string;
};

type DemoApproval = {
  id: string;
  actionType: string;
  room: string;
  status: "pending" | "approved" | "rejected";
  payloadJson: string | null;
  createdAt: string;
};

type DemoHandoff = {
  id: string;
  fromRoom: string;
  toRoom: string;
  payloadJson: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
};

type DemoJob = {
  id: string;
  jobType: string;
  status: "scheduled" | "running" | "completed" | "failed";
  scheduledFor: string;
  lastRunAt: string | null;
  resultSummary: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoStrategy = {
  todaySummary: string;
  priorities: string[];
  risks: string[];
  opportunities: string[];
  insights: string[];
  revenue: { totalRevenue: number; projectCount: number; byProject: { projectId: string; name: string; revenue: number }[] };
  pipeline: { byStatus: Record<string, number>; readyForDelivery: number; bottlenecks: string[] };
};

const NOW = new Date("2026-03-17T16:30:00.000Z").toISOString();

function isoMinusHours(hours: number): string {
  const d = new Date(NOW);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "demo-proj-office-jersey-city",
    name: "Office Shoot (Jersey City)",
    client: "Nimbus Analytics",
    type: "Brand + workplace",
    status: "scheduled",
    location: "Jersey City, NJ",
    shootDate: "2026-03-20",
  },
  {
    id: "demo-proj-restaurant",
    name: "Restaurant Shoot",
    client: "Saffron & Stone",
    type: "Hospitality",
    status: "editing",
    location: "New York, NY",
    shootDate: "2026-03-14",
  },
  {
    id: "demo-proj-corporate-headshots",
    name: "Corporate Headshots",
    client: "Brightline Capital",
    type: "Headshots",
    status: "ready_for_delivery",
    location: "New York, NY",
    shootDate: "2026-03-10",
  },
];

export const DEMO_DRAFTS: DemoDraft[] = [
  {
    id: "demo-draft-delivery-email-1",
    room: "delivery",
    type: "Delivery email draft",
    projectId: "demo-proj-corporate-headshots",
    createdAt: isoMinusHours(18),
    content:
      "Subject: Your headshots are ready\n\nHi team — your gallery is ready for review. I’ve included both color and B&W selects, plus a few alternates.\n\nNext step: please mark favorites for final retouch. Turnaround after selects is typically 48 hours.\n\nBest,\nBright Line Studio",
  },
  {
    id: "demo-draft-delivery-email-2",
    room: "delivery",
    type: "Gallery follow-up draft",
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(28),
    content:
      "Subject: Quick check-in on your restaurant gallery\n\nHi — just checking in to see if you had any feedback on the first pass. If you’d like, I can prioritize hero dishes + interiors first for your upcoming menu refresh.\n\nBest,\nBright Line Studio",
  },
  {
    id: "demo-draft-marketing-post-1",
    room: "marketing",
    type: "Instagram caption draft",
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(40),
    content:
      "Warm light, sharp details, and a menu built for sharing. Recent hospitality session for Saffron & Stone — focused on texture, plating, and atmosphere.\n\n#foodphotography #hospitality #nyc",
  },
  {
    id: "demo-draft-marketing-post-2",
    room: "marketing",
    type: "Case study outline",
    projectId: "demo-proj-office-jersey-city",
    createdAt: isoMinusHours(12),
    content:
      "Case study outline: Nimbus Analytics office shoot\n- Objective: update brand library for site + recruiting\n- Approach: candid collaboration + environment portraits\n- Deliverables: 60 images, 3 hero composites, 2 banner crops\n- Timeline: pre-pro call → half-day shoot → 5-day delivery",
  },
];

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "demo-evt-1",
    room: "reception",
    agent: "Concierge Agent",
    type: "lead_triaged",
    status: "success",
    summary: 'New inquiry tagged “hospitality” and handed off to Production',
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(46),
  },
  {
    id: "demo-evt-2",
    room: "production",
    agent: "Producer Agent",
    type: "shoot_plan_created",
    status: "success",
    summary: "Built a shoot plan: food heroes, interiors, and staff portraits",
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(45),
  },
  {
    id: "demo-evt-3",
    room: "editing",
    agent: "Editing Agent",
    type: "cull_complete",
    status: "success",
    summary: "Cull complete: 180 selects → 65 finals queued for retouch",
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(26),
  },
  {
    id: "demo-evt-4",
    room: "delivery",
    agent: "Delivery Agent",
    type: "delivery_draft_prepared",
    status: "success",
    summary: "Prepared delivery email draft for review",
    projectId: "demo-proj-corporate-headshots",
    createdAt: isoMinusHours(18),
  },
  {
    id: "demo-evt-5",
    room: "marketing",
    agent: "Marketing Agent",
    type: "caption_drafted",
    status: "success",
    summary: "Drafted social caption from hospitality selects",
    projectId: "demo-proj-restaurant",
    createdAt: isoMinusHours(40),
  },
  {
    id: "demo-evt-6",
    room: "automation",
    agent: "Automation Engine",
    type: "automation_prepared",
    status: "pending",
    summary: "Prepared follow-up reminder (awaiting approval)",
    projectId: "demo-proj-office-jersey-city",
    createdAt: isoMinusHours(8),
  },
  {
    id: "demo-evt-7",
    room: "strategy",
    agent: "Founder Strategy Agent",
    type: "daily_summary_generated",
    status: "success",
    summary: "Daily summary refreshed with pipeline and bottlenecks",
    projectId: null,
    createdAt: isoMinusHours(3),
  },
];

export const DEMO_APPROVALS: DemoApproval[] = [
  {
    id: "demo-appr-1",
    room: "automation",
    actionType: "automation_prepared_action",
    status: "pending",
    createdAt: isoMinusHours(8),
    payloadJson: JSON.stringify({
      kind: "create_reminder",
      projectId: "demo-proj-office-jersey-city",
      dueDate: "2026-03-19",
      message: "Follow up with Nimbus Analytics on usage rights + delivery deadline.",
    }),
  },
  {
    id: "demo-appr-2",
    room: "production",
    actionType: "status_change",
    status: "pending",
    createdAt: isoMinusHours(14),
    payloadJson: JSON.stringify({
      projectId: "demo-proj-restaurant",
      suggestedStatus: "delivery",
      note: "Edits are ready — prep delivery draft and send gallery.",
    }),
  },
];

export const DEMO_HANDOFFS: DemoHandoff[] = [
  {
    id: "demo-handoff-1",
    fromRoom: "reception",
    toRoom: "production",
    status: "pending",
    createdAt: isoMinusHours(46),
    payloadJson: JSON.stringify({
      projectName: "Restaurant Shoot",
      client: "Saffron & Stone",
      type: "Hospitality",
      summary: "Menu refresh + new website images. Needs 12 hero dishes + 6 interiors + 4 staff portraits.",
      inquirySnippet: "We’re updating our site and menu — looking for clean, warm imagery and quick turnaround.",
    }),
  },
];

export const DEMO_JOBS: DemoJob[] = [
  {
    id: "demo-job-1",
    jobType: "daily_strategy_summary",
    status: "completed",
    scheduledFor: isoMinusHours(4),
    lastRunAt: isoMinusHours(3),
    resultSummary: "Daily strategy summary generated (pipeline stable; delivery bottleneck improving).",
    projectId: null,
    createdAt: isoMinusHours(4),
    updatedAt: isoMinusHours(3),
  },
  {
    id: "demo-job-2",
    jobType: "refresh_archive_summary",
    status: "completed",
    scheduledFor: isoMinusHours(30),
    lastRunAt: isoMinusHours(29),
    resultSummary: "Archive summary refreshed (3 projects updated).",
    projectId: null,
    createdAt: isoMinusHours(30),
    updatedAt: isoMinusHours(29),
  },
];

export const DEMO_SUMMARY_METRICS: SummaryMetric[] = [
  { id: "activeProjects", label: "Active Projects", value: 3, hint: "Demo" },
  { id: "awaitingApproval", label: "Pending Approvals", value: DEMO_APPROVALS.filter((a) => a.status === "pending").length, hint: "Demo" },
  { id: "deliveryDrafts", label: "Delivery Drafts", value: DEMO_DRAFTS.filter((d) => d.room === "delivery").length, hint: "Demo" },
  { id: "contentQueue", label: "Content Queue", value: DEMO_DRAFTS.filter((d) => d.room === "marketing").length, hint: "Demo" },
];

export const DEMO_STRATEGY: DemoStrategy = {
  todaySummary:
    "Today: delivery is on track for Corporate Headshots, Restaurant Shoot is finishing retouch, and Office Shoot is scheduled with remaining pre-pro items. Biggest unlock: approve automation follow-up + confirm usage rights for Nimbus.",
  priorities: [
    "Approve the automation follow-up reminder for Nimbus Analytics.",
    "Send first-pass gallery for Restaurant Shoot by end of day.",
    "Confirm final headshot retouch selects (48h turnaround).",
  ],
  risks: [
    "Restaurant menu refresh deadline is tight; delivery slipping would impact launch assets.",
    "Usage rights scope for office imagery needs confirmation before publishing.",
  ],
  opportunities: [
    "Upsell: quarterly content retainer for Nimbus Analytics (recruiting + leadership updates).",
    "Repurpose hospitality selects into 3-post campaign + SEO case study.",
  ],
  insights: [
    "Hospitality projects convert faster when we lead with a shot list + hero deliverable examples.",
    "Headshot deliveries speed up when clients pre-approve background/skin tone targets.",
  ],
  revenue: {
    totalRevenue: 12750,
    projectCount: 3,
    byProject: [
      { projectId: "demo-proj-corporate-headshots", name: "Corporate Headshots", revenue: 4500 },
      { projectId: "demo-proj-restaurant", name: "Restaurant Shoot", revenue: 5250 },
      { projectId: "demo-proj-office-jersey-city", name: "Office Shoot (Jersey City)", revenue: 3000 },
    ],
  },
  pipeline: {
    byStatus: { scheduled: 1, editing: 1, ready_for_delivery: 1 },
    readyForDelivery: 1,
    bottlenecks: ["Retouch queue: prioritize Restaurant Shoot heroes", "Awaiting approval: automation follow-up reminder"],
  },
};

export function demoSearch(query: string): {
  projects: DemoProject[];
  drafts: DemoDraft[];
  events: DemoEvent[];
} {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { projects: [], drafts: [], events: [] };

  const projects = DEMO_PROJECTS.filter((p) =>
    [p.name, p.client, p.type, p.location, p.status].filter(Boolean).join(" ").toLowerCase().includes(q)
  );
  const drafts = DEMO_DRAFTS.filter((d) => (d.type + " " + d.room + " " + d.content).toLowerCase().includes(q));
  const events = DEMO_EVENTS.filter((e) => (e.summary + " " + e.room + " " + e.agent).toLowerCase().includes(q));
  return { projects, drafts, events };
}

