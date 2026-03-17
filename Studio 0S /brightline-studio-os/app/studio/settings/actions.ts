"use server";

import { isOllamaAvailable, clearOllamaCache, OLLAMA_DEFAULT_MODEL } from "@/lib/ai/ollama";

export type OllamaStatusResult = {
  available: boolean;
  model: string;
  fallbackMode: boolean;
};

export async function getOllamaStatus(): Promise<OllamaStatusResult> {
  const available = await isOllamaAvailable();
  return {
    available,
    model: OLLAMA_DEFAULT_MODEL,
    fallbackMode: !available,
  };
}

export async function refreshOllamaStatus(): Promise<OllamaStatusResult> {
  clearOllamaCache();
  return getOllamaStatus();
}
