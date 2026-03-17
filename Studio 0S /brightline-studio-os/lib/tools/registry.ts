/**
 * Bright Line Studio OS – tool registry
 *
 * Uses AI service layer when Ollama available, fallback to templates otherwise.
 */

import {
  generateInquirySummary,
  classifyProjectType,
  generateReplyDraft,
  generateInstagramCaption,
  generateCaseStudy,
  generateProjectBrief,
  generateShotList,
  generateChecklist,
  summarizeProject,
  generateDeliveryChecklist,
  generateDeliveryEmailDraft,
  summarizeFinalAssets,
  generateFollowupText,
} from "@/lib/ai";

export type Tool = {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
  run: (input: unknown) => Promise<unknown>;
};

const tools: Record<string, Tool> = {};

function register(tool: Tool): void {
  tools[tool.id] = tool;
}

register({
  id: "summarize_inquiry",
  name: "Summarize inquiry",
  description: "Summarize a lead or inquiry and infer tone and intent.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const text =
      typeof input === "object" && input !== null && "text" in input && typeof (input as { text: string }).text === "string"
        ? (input as { text: string }).text
        : "";
    return generateInquirySummary(text);
  },
});

register({
  id: "classify_project_type",
  name: "Classify project type",
  description: "Classify the type of project from inquiry or context.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const text =
      typeof input === "object" && input !== null && "text" in input && typeof (input as { text: string }).text === "string"
        ? (input as { text: string }).text
        : "";
    return classifyProjectType(text);
  },
});

register({
  id: "generate_reply_draft",
  name: "Generate reply draft",
  description: "Generate a draft reply to an inquiry.",
  requiresApproval: true,
  run: async (input: unknown) => {
    const text =
      typeof input === "object" && input !== null && "text" in input && typeof (input as { text: string }).text === "string"
        ? (input as { text: string }).text
        : "";
    return generateReplyDraft(text);
  },
});

register({
  id: "generate_instagram_caption",
  name: "Generate Instagram caption",
  description: "Generate a social caption for a project.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "this shoot";
    return generateInstagramCaption(projectName);
  },
});

register({
  id: "generate_case_study",
  name: "Generate case study",
  description: "Generate a short case study structure for a project.",
  requiresApproval: true,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    return generateCaseStudy(projectName);
  },
});

register({
  id: "generate_project_brief",
  name: "Generate project brief",
  description: "Extract a project brief from notes.",
  requiresApproval: true,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "New project";
    const notes =
      typeof input === "object" &&
      input !== null &&
      "notes" in input &&
      typeof (input as { notes: string }).notes === "string"
        ? (input as { notes: string }).notes
        : "";
    return generateProjectBrief(projectName, notes);
  },
});

register({
  id: "generate_shot_list",
  name: "Generate shot list",
  description: "Generate suggested shot types for a project.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    const count =
      typeof input === "object" &&
      input !== null &&
      "count" in input &&
      typeof (input as { count: number }).count === "number"
        ? (input as { count: number }).count
        : 5;
    return generateShotList(projectName, count);
  },
});

register({
  id: "generate_checklist",
  name: "Generate checklist",
  description: "Generate shoot or gear checklist for a project.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    const kind =
      typeof input === "object" &&
      input !== null &&
      "kind" in input &&
      ((input as { kind: string }).kind === "shoot" || (input as { kind: string }).kind === "gear")
        ? (input as { kind: "shoot" | "gear" }).kind
        : "shoot";
    return generateChecklist(projectName, kind);
  },
});

register({
  id: "summarize_project",
  name: "Summarize project",
  description: "Summarize a project and extract priorities.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" &&
      input !== null &&
      "projectName" in input &&
      typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    const notes =
      typeof input === "object" &&
      input !== null &&
      "notes" in input &&
      typeof (input as { notes: string }).notes === "string"
        ? (input as { notes: string }).notes
        : "";
    return summarizeProject(projectName, notes);
  },
});

register({
  id: "generate_delivery_checklist",
  name: "Generate delivery checklist",
  description: "Generate delivery prep checklist for a project.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" && input !== null && "projectName" in input && typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    return generateDeliveryChecklist(projectName);
  },
});

register({
  id: "generate_delivery_email_draft",
  name: "Generate delivery email draft",
  description: "Generate client handoff email draft.",
  requiresApproval: true,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" && input !== null && "projectName" in input && typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    const clientName =
      typeof input === "object" && input !== null && "clientName" in input && typeof (input as { clientName: string }).clientName === "string"
        ? (input as { clientName: string }).clientName
        : undefined;
    return generateDeliveryEmailDraft(projectName, clientName);
  },
});

register({
  id: "summarize_final_assets",
  name: "Summarize final assets",
  description: "Summarize final deliverables for a project.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" && input !== null && "projectName" in input && typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    const notes =
      typeof input === "object" && input !== null && "notes" in input && typeof (input as { notes: string }).notes === "string"
        ? (input as { notes: string }).notes
        : undefined;
    return summarizeFinalAssets(projectName, notes);
  },
});

register({
  id: "generate_followup_text",
  name: "Generate follow-up text",
  description: "Generate follow-up reminder for client.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const projectName =
      typeof input === "object" && input !== null && "projectName" in input && typeof (input as { projectName: string }).projectName === "string"
        ? (input as { projectName: string }).projectName
        : "Project";
    return generateFollowupText(projectName);
  },
});

register({
  id: "scan_image_folder",
  name: "Scan image folder",
  description: "Analyze folder for blur, low resolution, and possible duplicates.",
  requiresApproval: false,
  run: async (input: unknown) => {
    const { runImageScan } = await import("./imageTools");
    const folderPath =
      typeof input === "object" &&
      input !== null &&
      "folderPath" in input &&
      typeof (input as { folderPath: string }).folderPath === "string"
        ? (input as { folderPath: string }).folderPath
        : "";
    return runImageScan(folderPath);
  },
});

export function getTool(id: string): Tool | undefined {
  return tools[id];
}

export function listTools(): Tool[] {
  return Object.values(tools);
}
