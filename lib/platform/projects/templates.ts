import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import {
  listMirotechCaseStudyTemplateDefs,
  type MirotechCaseStudyTemplateDef,
} from "@/lib/platform/projects/mirotech-template-definitions";
import {
  resolveMirotechTemplateId,
  templateStructureSummary,
} from "@/lib/platform/projects/mirotech-template-apply";

export type ProjectWorkflowTemplateStructure = {
  coreFields: MirotechCaseStudyTemplateDef["coreFields"];
  sections: MirotechCaseStudyTemplateDef["sections"];
  mediaSlots: MirotechCaseStudyTemplateDef["mediaSlots"];
  seo: MirotechCaseStudyTemplateDef["seo"];
  technologyCategories: string[];
  aiDraft: { enabled: boolean };
};

export type ProjectWorkflowTemplate = {
  id: string;
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
  structure?: ProjectWorkflowTemplateStructure;
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

function mirotechTemplateToWorkflow(def: MirotechCaseStudyTemplateDef): ProjectWorkflowTemplate {
  return {
    id: def.id,
    tenant: "mirotech",
    kind: "mirotech-case-study",
    label: def.label,
    description: def.description,
    defaults: { ...def.defaults },
    structure: templateStructureSummary(def),
  };
}

const MIROTECH_TEMPLATES: ProjectWorkflowTemplate[] = listMirotechCaseStudyTemplateDefs().map(
  mirotechTemplateToWorkflow
);

export const PROJECT_WORKFLOW_TEMPLATES: ProjectWorkflowTemplate[] = [
  ...BRIGHTLINE_TEMPLATES,
  ...MIROTECH_TEMPLATES,
];

export function getProjectWorkflowTemplate(
  tenant: TenantSlug,
  templateId: string
): ProjectWorkflowTemplate | null {
  const resolvedId =
    tenant === "mirotech" ? resolveMirotechTemplateId(templateId) ?? templateId : templateId;
  return PROJECT_WORKFLOW_TEMPLATES.find((t) => t.tenant === tenant && t.id === resolvedId) ?? null;
}

export function listProjectWorkflowTemplates(
  tenant: TenantSlug,
  kind?: ProjectWorkflowKind
): ProjectWorkflowTemplate[] {
  return PROJECT_WORKFLOW_TEMPLATES.filter(
    (t) => t.tenant === tenant && (kind == null || t.kind === kind)
  );
}
