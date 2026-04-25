export type AiCompletionInput = {
  system?: string;
  prompt: string;
};

export type AiCompletionResult = {
  text: string;
  provider: string;
};

export type AiProvider = {
  name: string;
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
};

const ollamaPlaceholderProvider: AiProvider = {
  name: "ollama-placeholder",
  async complete() {
    throw new Error("Ollama provider is not configured.");
  },
};

export function getAiProvider(): AiProvider | null {
  if (process.env.STUDIO_OS_AI_PROVIDER === "ollama") {
    return ollamaPlaceholderProvider;
  }
  return null;
}
