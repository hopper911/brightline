import { createHash } from "crypto";
import type OpenAI from "openai";
import { platformLog } from "@/lib/observability/platform-log";
import { prisma } from "@/lib/prisma";
import { runChatCompletion } from "@/lib/ai/runtime";
import type { AiInvocationMeta, ChatCompletionBody } from "./types";
import { withChatRetry } from "./retry";

/** Persist structured AI call metadata when not explicitly disabled (set AI_OPS_UNIFIED=0 to opt out). */
export function aiOpsPersistenceEnabled(): boolean {
  return process.env.AI_OPS_UNIFIED !== "0";
}

function stableJsonHash(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const normalized: Record<string, unknown> = {};
  for (const k of keys) {
    normalized[k] = obj[k];
  }
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 32);
}

function extractUsage(completion: OpenAI.Chat.Completions.ChatCompletion) {
  const u = completion.usage;
  if (!u) return { promptTokens: null as number | null, completionTokens: null as number | null, totalTokens: null as number | null };
  return {
    promptTokens: u.prompt_tokens ?? null,
    completionTokens: u.completion_tokens ?? null,
    totalTokens: u.total_tokens ?? null,
  };
}

/**
 * Chat completion with retry, consistent error mapping via `runChatCompletion`, and optional DB audit row.
 */
export async function runAiChatCompletion(
  client: OpenAI,
  body: ChatCompletionBody,
  meta: AiInvocationMeta
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const modelUsed = typeof body.model === "string" ? body.model : String(body.model ?? "");
  const t0 = Date.now();
  let status: "ok" | "error" = "ok";
  let errorCode: string | null = null;
  let completion: OpenAI.Chat.Completions.ChatCompletion | null = null;

  try {
    completion = await withChatRetry(() => runChatCompletion(client, body));
  } catch (err) {
    status = "error";
    errorCode = err instanceof Error ? err.message.slice(0, 240) : "unknown_error";
    throw err;
  } finally {
    if (!aiOpsPersistenceEnabled()) {
      // skip
    } else {
      const latencyMs = Date.now() - t0;
      const inputSummary = meta.inputSummary ?? {};
      const inputHash = stableJsonHash({
        ...inputSummary,
        promptId: meta.promptId,
        promptVersion: meta.promptVersion,
        taskType: meta.taskType,
      });
      const usage = completion ? extractUsage(completion) : { promptTokens: null, completionTokens: null, totalTokens: null };
      prisma.aiInvocation
        .create({
          data: {
            taskType: meta.taskType,
            promptId: meta.promptId,
            promptVersion: meta.promptVersion,
            modelUsed: modelUsed || null,
            entityType: meta.entityType ?? null,
            entityId: meta.entityId ?? null,
            projectId: meta.projectId && meta.projectId !== "new" ? meta.projectId : null,
            workspaceId: null,
            status,
            errorCode,
            latencyMs,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            inputHash,
            createdBy: meta.createdBy ?? null,
          },
        })
        .catch((e) =>
          platformLog({
            severity: "warn",
            service: "platform",
            action: "ai.ops",
            message: "AiInvocation persist failed",
            meta: {
              error: e instanceof Error ? e.message : String(e),
            },
          })
        );
    }
  }

  return completion!;
}
