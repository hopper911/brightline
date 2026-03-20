/**
 * Mock data for /studio. Replace with real data later.
 */

export type RoomStatus = "green" | "amber" | "red" | "blue";

export interface StudioRoom {
  id: string;
  name: string;
  subtitle: string;
  status: RoomStatus;
  description?: string;
  keyTasks?: string[];
  /** Agent label for mission control UI (optional). */
  agent?: string;
}

/** Structured mock rooms for dashboard (id, name, status, description, agent). Use for visual-only deploy. */
export const studioRooms = [
  { id: "reception", name: "Reception", status: "amber" as RoomStatus, description: "Handle new leads and inquiries", agent: "Concierge Agent" },
  { id: "lounge", name: "Client Lounge", status: "blue" as RoomStatus, description: "Project briefs and mood boards", agent: "Briefing Assistant" },
  { id: "production", name: "Production Office", status: "blue" as RoomStatus, description: "Planning and scheduling", agent: "Producer Agent" },
  { id: "editing", name: "Editing Bay", status: "red" as RoomStatus, description: "Image analysis and review", agent: "Editing Agent" },
  { id: "delivery", name: "Delivery Suite", status: "green" as RoomStatus, description: "Client handoff and delivery", agent: "Delivery Agent" },
  { id: "publishing", name: "Publishing Office", status: "blue" as RoomStatus, description: "Content and SEO generation", agent: "Marketing Agent" },
  { id: "archive", name: "Archive Vault", status: "green" as RoomStatus, description: "Project storage and search", agent: "Archivist Agent" },
  { id: "strategy", name: "Strategy Room", status: "blue" as RoomStatus, description: "CEO dashboard and executive intelligence", agent: "Founder Strategy Agent" },
  { id: "automation", name: "Automation", status: "blue" as RoomStatus, description: "Approval-driven automation and reminders", agent: "Automation Engine" },
];

export interface SummaryMetric {
  id: string;
  label: string;
  value: number | string;
  hint?: string;
}

/** Order for floor plan: Main Studio Floor is the center hub (position 4 in 3-col grid). */
export const STUDIO_MAP_ORDER = [
  "reception",
  "lounge",
  "production",
  "editing",
  "main-studio",
  "publishing",
  "delivery",
  "archive",
  "strategy",
  "automation",
] as const;

export const MOCK_ROOMS: StudioRoom[] = [
  { id: "reception", name: "Reception", subtitle: "Leads and intake", status: "amber", description: "Front-of-house intake and lead triage. First point of contact for new enquiries and client check-ins.", keyTasks: ["Capture new leads", "Schedule consultations", "View today's arrivals"], agent: "Concierge Agent" },
  { id: "lounge", name: "Client Lounge", subtitle: "Client experience", status: "blue", description: "Client experience and hospitality. Manage preferences, lookbooks, and pre-session touchpoints.", keyTasks: ["Open client profile", "Send lookbook", "Log preferences"], agent: "Briefing Assistant" },
  { id: "production", name: "Production Office", subtitle: "Scheduling and logistics", status: "blue", description: "Scheduling, crew, and logistics. The operational core for shoot planning and resource allocation.", keyTasks: ["View production calendar", "Create shoot plan", "Assign crew"], agent: "Producer Agent" },
  { id: "main-studio", name: "Main Studio Floor", subtitle: "Capture operations hub", status: "green", description: "The heart of the studio. Live sessions, lighting setups, and capture pipelines in one operational view.", keyTasks: ["View today's shoots", "Open shot list", "Log setup preset"], agent: "Session Agent" },
  { id: "editing", name: "Editing Bay", subtitle: "Culling and post", status: "red", description: "Post-production and retouching queue. Prioritize edits and track delivery deadlines.", keyTasks: ["View edit queue", "Flag rush jobs", "Open retouch board"], agent: "Editing Agent" },
  { id: "delivery", name: "Delivery Suite", subtitle: "Galleries and handoff", status: "green", description: "Client delivery and approvals. Prepare galleries, send delivery emails, and track sign-off.", keyTasks: ["Prepare galleries", "Send delivery", "Review approvals"], agent: "Delivery Agent" },
  { id: "publishing", name: "Publishing Office", subtitle: "Content and campaigns", status: "blue", description: "Content and campaigns. Social, portfolio updates, and outbound storytelling.", keyTasks: ["Content calendar", "Portfolio updates", "Draft campaign"], agent: "Marketing Agent" },
  { id: "archive", name: "Archive Vault", subtitle: "Storage and retrieval", status: "green", description: "Long-term storage and retrieval. Search past shoots and manage retention.", keyTasks: ["Search archive", "Review expiring assets", "Restore collection"], agent: "Archivist Agent" },
  { id: "strategy", name: "Strategy Room", subtitle: "CEO dashboard", status: "blue", description: "Executive intelligence. Revenue snapshot, pipeline status, priorities, risks, and opportunities.", keyTasks: ["View daily summary", "Revenue overview", "Pipeline status", "Priorities & risks"], agent: "Founder Strategy Agent" },
  { id: "automation", name: "Automation", subtitle: "Controlled automation", status: "blue", description: "Approval-driven automation. Rules prepare drafts/reminders; you approve before anything is saved.", keyTasks: ["Review pending automation approvals", "Toggle rules", "Review reminders"], agent: "Automation Engine" },
];

export const MOCK_SUMMARY: SummaryMetric[] = [
  { id: "newLeads", label: "New Leads", value: 8, hint: "Last 24h" },
  { id: "activeProjects", label: "Active Projects", value: 21, hint: "In progress" },
  { id: "awaitingEdit", label: "Awaiting Edit", value: 47, hint: "Post queue" },
  { id: "readyForDelivery", label: "Ready for Delivery", value: 12, hint: "Cleared" },
  { id: "contentQueue", label: "Content Queue", value: 34, hint: "Marketing" },
];

/** Mock projects for Marketing room selector. Visual-only deploy uses this; replace with getDb() when backend is wired. */
export const MOCK_PROJECTS: { id: string; name: string }[] = [
  { id: "demo-proj-office-jersey-city", name: "Office Shoot (Jersey City)" },
  { id: "demo-proj-restaurant", name: "Restaurant Shoot" },
  { id: "demo-proj-corporate-headshots", name: "Corporate Headshots" },
];
