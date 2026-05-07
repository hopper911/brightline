import type OpenAI from "openai";

export type AiInvocationMeta = {
  taskType: string;
  promptId: string;
  promptVersion: number;
  /** Optional link for audit (e.g. work project CMS id). */
  projectId?: string | null;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
  /** Small, non-PII summary for hashing / support (e.g. mode keys only). */
  inputSummary?: Record<string, unknown>;
};

export type ChatCompletionBody = Parameters<OpenAI["chat"]["completions"]["create"]>[0];
