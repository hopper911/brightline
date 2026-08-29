/**
 * Mirotech case study workflow templates (Phase 23A).
 * Structure only — no fabricated project claims or metrics.
 */

import type { CaseStudySectionType } from "@/lib/dual-brand/case-study-template";

export type MirotechTemplateFieldDef = {
  key: string;
  label: string;
  required: boolean;
  hint: string;
};

export type MirotechTemplateSectionDef = {
  type: CaseStudySectionType;
  title: string;
  hint: string;
  mediaExpectation?: string;
};

export type MirotechTemplateMediaSlot = {
  key: string;
  label: string;
  required: boolean;
  hint: string;
};

export type MirotechTemplateSeoStructure = {
  titlePattern: string;
  descriptionHint: string;
  ogAssetSlotKey: string;
};

export type MirotechCaseStudyTemplateDef = {
  id: string;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
  coreFields: MirotechTemplateFieldDef[];
  sections: readonly MirotechTemplateSectionDef[];
  mediaSlots: MirotechTemplateMediaSlot[];
  seo: MirotechTemplateSeoStructure;
  technologyCategories: string[];
  aiDraft: {
    enabled: boolean;
    guidance: string;
  };
};

const SHARED_CORE_FIELDS: MirotechTemplateFieldDef[] = [
  {
    key: "summary",
    label: "Summary",
    required: true,
    hint: "One-sentence value proposition — honest scope, no invented metrics.",
  },
  {
    key: "role",
    label: "Role",
    required: true,
    hint: "Your role and collaborators; keep ownership clear.",
  },
  {
    key: "challenge",
    label: "Challenge",
    required: true,
    hint: "The problem context in one concise paragraph.",
  },
  {
    key: "outcome",
    label: "Outcome",
    required: true,
    hint: "What changed or shipped — describe impact without fabricating KPIs.",
  },
  {
    key: "projectDisclaimer",
    label: "Concept disclaimer",
    required: false,
    hint: "Required when referencing a real company/product as self-initiated or sample data.",
  },
];

const SHARED_MEDIA_SLOTS: MirotechTemplateMediaSlot[] = [
  {
    key: "heroImage",
    label: "Hero image",
    required: true,
    hint: "Primary case study visual — product UI, architecture diagram, or key deliverable.",
  },
  {
    key: "thumbnailImage",
    label: "Thumbnail",
    required: false,
    hint: "Card thumbnail for work index grids.",
  },
  {
    key: "backgroundMedia",
    label: "Background media",
    required: false,
    hint: "Optional ambient video or still for case study header.",
  },
];

const SHARED_SEO: MirotechTemplateSeoStructure = {
  titlePattern: "{Project title} | MiroTech Solutions",
  descriptionHint:
    "Lead with the problem and honest scope in ≤160 characters. No fabricated metrics or customer claims.",
  ogAssetSlotKey: "heroImage",
};

const AI_HONESTY_SUFFIX =
  "Never invent ROI, customers, production metrics, or client results. Label sample data. Usability observations are findings, not KPIs.";

const AI_SAAS_SECTIONS: readonly MirotechTemplateSectionDef[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "One-sentence business value; your role; concept disclaimer if needed.",
  },
  {
    type: "text",
    title: "Problem and users",
    hint: "Product problem, target users, and what decision-makers need to understand.",
  },
  {
    type: "text",
    title: "AI capability scope",
    hint: "What the AI layer does, model boundaries, and explicit limitations — no hype.",
  },
  {
    type: "gallery",
    title: "Product walkthrough",
    hint: "Selected screens or flows — desktop and mobile when relevant.",
    mediaExpectation: "3–8 UI or architecture visuals with short captions.",
  },
  {
    type: "text",
    title: "Architecture and delivery",
    hint: "Stack choices, integration points, and how the system ships safely.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Metrics: Target: … only when proposed. Body: learnings and next experiments.",
  },
];

const AI_AUTOMATION_SECTIONS: readonly MirotechTemplateSectionDef[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "Workflow value in one sentence; your role; disclaimer if conceptual.",
  },
  {
    type: "text",
    title: "Workflow problem",
    hint: "Manual steps, failure modes, and operational cost — honest scope.",
  },
  {
    type: "text",
    title: "Agent and automation design",
    hint: "Triggers, agent responsibilities, human-in-the-loop gates, and guardrails.",
  },
  {
    type: "gallery",
    title: "Before and after workflow",
    hint: "Diagram or flow comparison — selected steps only.",
    mediaExpectation: "Workflow diagrams or automation sequence visuals.",
  },
  {
    type: "text",
    title: "Integrations and reliability",
    hint: "Systems touched, error handling, monitoring, and rollback posture.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Target operational improvements only — never invented throughput or ROI.",
  },
];

const DATA_INTELLIGENCE_SECTIONS: readonly MirotechTemplateSectionDef[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "Data intelligence value proposition; role; disclaimer when sample data.",
  },
  {
    type: "text",
    title: "Data problem and sources",
    hint: "What decisions were blocked; data sources and quality constraints.",
  },
  {
    type: "text",
    title: "Pipeline and modeling",
    hint: "Ingestion, transformation, and modeling approach — limits included.",
  },
  {
    type: "gallery",
    title: "Insights and dashboards",
    hint: "Selected dashboards or insight views with captions.",
    mediaExpectation: "Dashboard screenshots or data visualization samples.",
  },
  {
    type: "text",
    title: "Governance and access",
    hint: "Access control, lineage, and how stakeholders trust the numbers.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Proposed measurement plan — label targets, not live results.",
  },
];

const FINTECH_COMPLIANCE_SECTIONS: readonly MirotechTemplateSectionDef[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "Regulated-domain value; your role; concept disclaimer when applicable.",
  },
  {
    type: "text",
    title: "Regulatory and risk context",
    hint: "Compliance drivers, audit expectations, and scope boundaries.",
  },
  {
    type: "text",
    title: "Controls and auditability",
    hint: "Controls implemented, audit trails, and evidence collection — no invented certifications.",
  },
  {
    type: "gallery",
    title: "Platform architecture",
    hint: "Architecture or control-flow visuals — selected diagrams only.",
    mediaExpectation: "Architecture diagrams or control-surface screenshots.",
  },
  {
    type: "text",
    title: "Security posture",
    hint: "Auth, encryption, segregation, and operational security — factual only.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Compliance or risk targets as proposals — never fabricated audit outcomes.",
  },
];

const OPERATIONAL_WORKFLOW_SECTIONS: readonly MirotechTemplateSectionDef[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "Operational SaaS value; your role; disclaimer if self-initiated.",
  },
  {
    type: "text",
    title: "Operational problem",
    hint: "Teams, handoffs, and friction — what the workflow software must fix.",
  },
  {
    type: "text",
    title: "Workflow design",
    hint: "States, approvals, notifications, and edge cases.",
  },
  {
    type: "gallery",
    title: "Implementation highlights",
    hint: "Key screens, states (empty/loading/error), and rollout views.",
    mediaExpectation: "Product UI for workflow states and admin surfaces.",
  },
  {
    type: "text",
    title: "Rollout and change management",
    hint: "Pilot approach, training, and how adoption was measured honestly.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Operational targets as proposals; reflection on what to validate next.",
  },
];

export const MIROTECH_CASE_STUDY_TEMPLATE_DEFS: readonly MirotechCaseStudyTemplateDef[] = [
  {
    id: "ai-saas-platform",
    label: "AI SaaS Platform",
    description: "Product-led AI SaaS narrative — capability scope, architecture, and honest outcomes.",
    defaults: {
      projectType: "SELF_DIRECTED_CASE_STUDY",
      categories: ["AI", "SaaS"],
      disciplines: ["Product", "Engineering"],
    },
    coreFields: SHARED_CORE_FIELDS,
    sections: AI_SAAS_SECTIONS,
    mediaSlots: SHARED_MEDIA_SLOTS,
    seo: SHARED_SEO,
    technologyCategories: ["LLM / AI", "Cloud", "Frontend", "Backend", "API"],
    aiDraft: {
      enabled: true,
      guidance: `Case study template: AI SaaS Platform. Emphasize product problem, AI scope and limits, architecture, and delivery. ${AI_HONESTY_SUFFIX}`,
    },
  },
  {
    id: "ai-automation-agent-workflow",
    label: "AI Automation / Agent Workflow",
    description: "Agent or workflow automation story with guardrails and integration context.",
    defaults: {
      projectType: "MIROTECH_INITIATIVE",
      categories: ["AI", "Automation"],
      disciplines: ["Engineering", "Operations"],
    },
    coreFields: SHARED_CORE_FIELDS,
    sections: AI_AUTOMATION_SECTIONS,
    mediaSlots: SHARED_MEDIA_SLOTS,
    seo: SHARED_SEO,
    technologyCategories: ["LLM / AI", "Automation", "Integrations", "Observability"],
    aiDraft: {
      enabled: true,
      guidance: `Case study template: AI Automation / Agent Workflow. Emphasize workflow pain, agent design, human-in-the-loop, and reliability. ${AI_HONESTY_SUFFIX}`,
    },
  },
  {
    id: "data-intelligence-platform",
    label: "Data Intelligence Platform",
    description: "Analytics, pipelines, and insight surfaces with governance narrative.",
    defaults: {
      projectType: "RESEARCH_LED_CONCEPT",
      categories: ["Data", "Analytics"],
      disciplines: ["Data", "Engineering"],
    },
    coreFields: SHARED_CORE_FIELDS,
    sections: DATA_INTELLIGENCE_SECTIONS,
    mediaSlots: SHARED_MEDIA_SLOTS,
    seo: SHARED_SEO,
    technologyCategories: ["Data pipeline", "Analytics", "Visualization", "Governance"],
    aiDraft: {
      enabled: true,
      guidance: `Case study template: Data Intelligence Platform. Emphasize data sources, pipeline, insights UI, and governance. ${AI_HONESTY_SUFFIX}`,
    },
  },
  {
    id: "fintech-compliance-platform",
    label: "FinTech / Compliance Platform",
    description: "Regulated-domain platform with controls, auditability, and security posture.",
    defaults: {
      projectType: "INDEPENDENT_CONCEPT",
      categories: ["FinTech", "Compliance"],
      disciplines: ["Engineering", "Product"],
    },
    coreFields: SHARED_CORE_FIELDS,
    sections: FINTECH_COMPLIANCE_SECTIONS,
    mediaSlots: SHARED_MEDIA_SLOTS,
    seo: SHARED_SEO,
    technologyCategories: ["Security", "Compliance", "Cloud", "Audit logging"],
    aiDraft: {
      enabled: true,
      guidance: `Case study template: FinTech / Compliance Platform. Emphasize regulatory context, controls, architecture, and security — no invented certifications. ${AI_HONESTY_SUFFIX}`,
    },
  },
  {
    id: "operational-workflow-saas",
    label: "Operational Workflow SaaS",
    description: "B2B workflow software — design, implementation, and rollout narrative.",
    defaults: {
      projectType: "CLIENT_COMMISSION",
      categories: ["SaaS", "Operations"],
      disciplines: ["Product", "Engineering"],
    },
    coreFields: SHARED_CORE_FIELDS,
    sections: OPERATIONAL_WORKFLOW_SECTIONS,
    mediaSlots: SHARED_MEDIA_SLOTS,
    seo: SHARED_SEO,
    technologyCategories: ["SaaS", "Workflow", "Frontend", "Integrations"],
    aiDraft: {
      enabled: true,
      guidance: `Case study template: Operational Workflow SaaS. Emphasize operational problem, workflow design, rollout, and honest adoption framing. ${AI_HONESTY_SUFFIX}`,
    },
  },
];

/** Legacy template ids from Phase 22A — map to Phase 23A equivalents. */
export const LEGACY_MIROTECH_TEMPLATE_ID_MAP: Record<string, string> = {
  "ai-saas-case-study": "ai-saas-platform",
  "automation-platform": "ai-automation-agent-workflow",
  "data-platform": "data-intelligence-platform",
};

export function getMirotechCaseStudyTemplateDef(templateId: string): MirotechCaseStudyTemplateDef | null {
  const normalized = LEGACY_MIROTECH_TEMPLATE_ID_MAP[templateId] ?? templateId;
  return MIROTECH_CASE_STUDY_TEMPLATE_DEFS.find((t) => t.id === normalized) ?? null;
}

export function listMirotechCaseStudyTemplateDefs(): MirotechCaseStudyTemplateDef[] {
  return [...MIROTECH_CASE_STUDY_TEMPLATE_DEFS];
}

export type MirotechTemplateSectionPayload = {
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sortOrder: number;
};

export function buildMirotechTemplateSectionPayload(
  def: MirotechCaseStudyTemplateDef
): MirotechTemplateSectionPayload[] {
  return def.sections.map((section, index) => ({
    type: section.type,
    title: section.title,
    body: "",
    data: {},
    sortOrder: index,
  }));
}
