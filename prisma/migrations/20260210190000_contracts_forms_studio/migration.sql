-- Contracts & Forms Studio — additive migration (fix: complete ordering)

CREATE TYPE "DocumentTemplateType" AS ENUM (
  'COMMERCIAL_PHOTOGRAPHY_AGREEMENT',
  'ARCHITECTURE_REAL_ESTATE_AGREEMENT',
  'CORPORATE_PORTRAIT_AGREEMENT',
  'IMAGE_LICENSING_AGREEMENT',
  'CANCELLATION_RESCHEDULING_AGREEMENT',
  'MODEL_RELEASE',
  'PROPERTY_RELEASE',
  'FINAL_DELIVERY_APPROVAL',
  'REVISION_REQUEST',
  'OTHER'
);

CREATE TYPE "GeneratedDocumentStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'SENT',
  'VIEWED',
  'SIGNED',
  'DECLINED',
  'EXPIRED',
  'ARCHIVED'
);

CREATE TYPE "FormTemplateType" AS ENUM (
  'PROJECT_INTAKE',
  'PRE_SHOOT_QUESTIONNAIRE',
  'SHOT_LIST',
  'LOCATION_ACCESS',
  'DELIVERY_APPROVAL',
  'REVISION_REQUEST_FORM',
  'TESTIMONIAL_REQUEST',
  'OTHER'
);

CREATE TYPE "FormFieldType" AS ENUM (
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'DATE',
  'CHECKBOX',
  'SELECT',
  'MULTISELECT'
);

CREATE TYPE "FormSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

ALTER TABLE "StudioProject" ADD COLUMN "requireSignedDocumentTypes" JSONB;

CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentTemplateType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "contentHtml" TEXT NOT NULL,
    "contentJson" JSONB,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studioClientId" TEXT NOT NULL,
    "studioProjectId" TEXT,
    "studioInvoiceId" TEXT,
    "title" TEXT NOT NULL,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "contentHtml" TEXT NOT NULL,
    "variablesSnapshot" JSONB NOT NULL DEFAULT '{}',
    "draftPdfKey" TEXT,
    "signedPdfKey" TEXT,
    "clientToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedDocument_clientToken_key" ON "GeneratedDocument"("clientToken");

CREATE TABLE "DocumentSignature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "consentAccepted" BOOLEAN NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "documentVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentSignature_documentId_key" ON "DocumentSignature"("documentId");

CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "FormTemplateType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FormFieldType" NOT NULL DEFAULT 'TEXT',
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mapsToProjectField" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "studioClientId" TEXT NOT NULL,
    "studioProjectId" TEXT,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "clientToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormSubmission_clientToken_key" ON "FormSubmission"("clientToken");

CREATE TABLE "FormSubmissionValue" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormSubmissionValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormSubmissionValue_submissionId_fieldId_key" ON "FormSubmissionValue"("submissionId", "fieldId");

CREATE TABLE "DocumentAuditLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "formSubmissionId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_studioInvoiceId_fkey" FOREIGN KEY ("studioInvoiceId") REFERENCES "StudioInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GeneratedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FormSubmissionValue" ADD CONSTRAINT "FormSubmissionValue_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmissionValue" ADD CONSTRAINT "FormSubmissionValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GeneratedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");
CREATE INDEX "GeneratedDocument_studioClientId_idx" ON "GeneratedDocument"("studioClientId");
CREATE INDEX "GeneratedDocument_studioProjectId_idx" ON "GeneratedDocument"("studioProjectId");
CREATE INDEX "GeneratedDocument_studioInvoiceId_idx" ON "GeneratedDocument"("studioInvoiceId");
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");
CREATE INDEX "GeneratedDocument_signedAt_idx" ON "GeneratedDocument"("signedAt");
CREATE INDEX "GeneratedDocument_expiresAt_idx" ON "GeneratedDocument"("expiresAt");
CREATE INDEX "DocumentAuditLog_documentId_createdAt_idx" ON "DocumentAuditLog"("documentId", "createdAt");
CREATE INDEX "DocumentAuditLog_formSubmissionId_createdAt_idx" ON "DocumentAuditLog"("formSubmissionId", "createdAt");
CREATE INDEX "DocumentAuditLog_action_createdAt_idx" ON "DocumentAuditLog"("action", "createdAt");
CREATE INDEX "FormTemplate_type_idx" ON "FormTemplate"("type");
CREATE INDEX "FormTemplate_isActive_idx" ON "FormTemplate"("isActive");
CREATE INDEX "FormField_formTemplateId_sortOrder_idx" ON "FormField"("formTemplateId", "sortOrder");
CREATE INDEX "FormSubmission_studioClientId_idx" ON "FormSubmission"("studioClientId");
CREATE INDEX "FormSubmission_studioProjectId_idx" ON "FormSubmission"("studioProjectId");
CREATE INDEX "FormSubmission_status_idx" ON "FormSubmission"("status");
CREATE INDEX "FormSubmissionValue_submissionId_fieldId_idx" ON "FormSubmissionValue"("submissionId", "fieldId");
