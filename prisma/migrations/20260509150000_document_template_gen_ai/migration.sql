-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN "genAiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DocumentTemplate" ADD COLUMN "genAiSystemPrompt" TEXT;
ALTER TABLE "DocumentTemplate" ADD COLUMN "genAiUserPrompt" TEXT;
ALTER TABLE "DocumentTemplate" ADD COLUMN "genAiModel" TEXT;
