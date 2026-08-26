/**
 * Future: structured prompts / clause generation against `DocumentTemplate.contentJson`.
 * No runtime AI calls in MVP — types reserved for integration with `/api/ai/chat` or similar.
 */

export type ContractTemplateAiContext = {
  templateId: string;
  templateType: string;
  title: string;
  variables: string[];
  genAiEnabled: boolean;
  genAiSystemPrompt: string | null;
  genAiUserPrompt: string | null;
  genAiModel: string | null;
};

export type ContractAiDraftRequest = {
  context: ContractTemplateAiContext;
  operatorInstruction: string;
};
