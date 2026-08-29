import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type ProjectWorkflowTemplate = {
  id: string;
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
};

const BRIGHTLINE_TEMPLATES: ProjectWorkflowTemplate[] = [
  {
    id: "commercial-architecture",
    tenant: "brightline",
    kind: "work-project",
    label: "Commercial architecture",
    description: "Architecture & design portfolio case study (ACD pillar).",
    defaults: { pillarSlug: "acd", summary: "" },
  },
  {
    id: "hospitality",
    tenant: "brightline",
    kind: "work-project",
    label: "Hospitality",
    description: "Hotels, restaurants, and hospitality interiors.",
    defaults: { pillarSlug: "rea", summary: "" },
  },
  {
    id: "editorial",
    tenant: "brightline",
    kind: "work-project",
    label: "Editorial",
    description: "Editorial and culture-forward photography.",
    defaults: { pillarSlug: "cul", summary: "" },
  },
  {
    id: "event",
    tenant: "brightline",
    kind: "work-project",
    label: "Event",
    description: "Corporate and social event coverage.",
    defaults: { pillarSlug: "biz", summary: "" },
  },
  {
    id: "headshot",
    tenant: "brightline",
    kind: "work-project",
    label: "Headshot / portrait",
    description: "Executive and portrait sessions.",
    defaults: { pillarSlug: "biz", summary: "" },
  },
];

const MIROTECH_TEMPLATES: ProjectWorkflowTemplate[] = [
  {
    id: "ai-saas-case-study",
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: "AI SaaS case study",
    description: "Product-led AI SaaS narrative with outcome metrics.",
    defaults: {
      projectType: "SELF_DIRECTED_CASE_STUDY",
      categories: ["AI", "SaaS"],
      disciplines: ["Product", "Engineering"],
    },
  },
  {
    id: "automation-platform",
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: "Automation platform",
    description: "Workflow automation or integration platform story.",
    defaults: {
      projectType: "MIROTECH_INITIATIVE",
      categories: ["Automation"],
      disciplines: ["Engineering", "Operations"],
    },
  },
  {
    id: "data-platform",
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: "Data platform",
    description: "Analytics, data pipeline, or platform engineering case study.",
    defaults: {
      projectType: "RESEARCH_LED_CONCEPT",
      categories: ["Data"],
      disciplines: ["Data", "Engineering"],
    },
  },
  {
    id: "product-design-case-study",
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: "Product design case study",
    description: "UX/product design with research and delivery narrative.",
    defaults: {
      projectType: "INDEPENDENT_CONCEPT",
      categories: ["Product"],
      disciplines: ["Design", "Research"],
    },
  },
  {
    id: "full-stack-web-app",
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: "Full-stack web application",
    description: "End-to-end web application delivery story.",
    defaults: {
      projectType: "CLIENT_COMMISSION",
      categories: ["Web"],
      disciplines: ["Engineering", "Design"],
    },
  },
];

export const PROJECT_WORKFLOW_TEMPLATES: ProjectWorkflowTemplate[] = [
  ...BRIGHTLINE_TEMPLATES,
  ...MIROTECH_TEMPLATES,
];

export function getProjectWorkflowTemplate(
  tenant: TenantSlug,
  templateId: string
): ProjectWorkflowTemplate | null {
  return PROJECT_WORKFLOW_TEMPLATES.find((t) => t.tenant === tenant && t.id === templateId) ?? null;
}

export function listProjectWorkflowTemplates(
  tenant: TenantSlug,
  kind?: ProjectWorkflowKind
): ProjectWorkflowTemplate[] {
  return PROJECT_WORKFLOW_TEMPLATES.filter(
    (t) => t.tenant === tenant && (kind == null || t.kind === kind)
  );
}
