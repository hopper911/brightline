-- Studio OS Phase 1 foundation (additive-only)

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('INQUIRY', 'PLANNED', 'SCHEDULED', 'SHOT', 'INGESTING', 'EDITING', 'PROOF_READY', 'CLIENT_REVIEWING', 'FINAL_APPROVED', 'DELIVERED', 'CASE_STUDY_DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REVIEWED', 'QUALIFIED', 'FOLLOW_UP_NEEDED', 'PROPOSAL_PENDING', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENT', 'CLIENT_REVIEWING', 'SELECTIONS_RECEIVED', 'FINALIZED', 'DELIVERED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GalleryType" AS ENUM ('PROOF', 'SELECTION', 'FINAL_DELIVERY', 'INTERNAL_REVIEW');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'AI_DRAFTED', 'HUMAN_EDITED', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'UPDATED');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('INTERNAL', 'CLIENT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MediaOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT', 'SQUARE', 'PANORAMIC');

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "studioProjectId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "studioLeadId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "studioProjectId" TEXT;

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "heroStudioMediaId" TEXT,
ADD COLUMN     "isPublicReady" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pillar" TEXT,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "publishingStatus" TEXT,
ADD COLUMN     "shootDate" TIMESTAMP(3),
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'INQUIRY',
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN     "studioProjectId" TEXT;

-- CreateTable
CREATE TABLE "StudioClient" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "inquirySource" TEXT,
    "serviceType" TEXT,
    "budgetRange" TEXT,
    "timeline" TEXT,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "followUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "convertedClientId" TEXT,
    "convertedProjectId" TEXT,
    "legacyLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioMedia" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filenameBase" TEXT NOT NULL,
    "r2KeyFull" TEXT NOT NULL,
    "r2KeyThumb" TEXT,
    "urlFull" TEXT NOT NULL,
    "urlThumb" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "orientation" "MediaOrientation",
    "altText" TEXT,
    "description" TEXT,
    "tagsCsv" TEXT,
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'INTERNAL',
    "isHeroCandidate" BOOLEAN NOT NULL DEFAULT false,
    "isHeroSelected" BOOLEAN NOT NULL DEFAULT false,
    "isApprovedForWork" BOOLEAN NOT NULL DEFAULT false,
    "isApprovedForPortfolio" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sequenceNumber" INTEGER,
    "aiLabels" JSONB,
    "qualityScore" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioGallery" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "galleryType" "GalleryType" NOT NULL,
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "accessCode" TEXT,
    "passwordHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioGalleryMedia" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "selectionState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioGalleryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCaseStudy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heroMediaId" TEXT,
    "summary" TEXT,
    "businessContext" TEXT,
    "approach" TEXT,
    "outcome" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "WorkStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkMedia" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "dateBucket" TIMESTAMP(3) NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "projectId" TEXT,
    "workId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "avgEngagementSeconds" DOUBLE PRECISION,
    "sourceMedium" TEXT,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggerType" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioClient_companyName_idx" ON "StudioClient"("companyName");

-- CreateIndex
CREATE INDEX "StudioClient_isActive_idx" ON "StudioClient"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudioLead_legacyLeadId_key" ON "StudioLead"("legacyLeadId");

-- CreateIndex
CREATE INDEX "StudioLead_status_idx" ON "StudioLead"("status");

-- CreateIndex
CREATE INDEX "StudioLead_followUpDate_idx" ON "StudioLead"("followUpDate");

-- CreateIndex
CREATE INDEX "StudioLead_convertedClientId_idx" ON "StudioLead"("convertedClientId");

-- CreateIndex
CREATE INDEX "StudioLead_convertedProjectId_idx" ON "StudioLead"("convertedProjectId");

-- CreateIndex
CREATE INDEX "StudioMedia_projectId_idx" ON "StudioMedia"("projectId");

-- CreateIndex
CREATE INDEX "StudioMedia_visibility_idx" ON "StudioMedia"("visibility");

-- CreateIndex
CREATE INDEX "StudioMedia_isApprovedForWork_idx" ON "StudioMedia"("isApprovedForWork");

-- CreateIndex
CREATE INDEX "StudioMedia_isApprovedForPortfolio_idx" ON "StudioMedia"("isApprovedForPortfolio");

-- CreateIndex
CREATE INDEX "StudioMedia_isFeatured_idx" ON "StudioMedia"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "StudioGallery_accessCode_key" ON "StudioGallery"("accessCode");

-- CreateIndex
CREATE INDEX "StudioGallery_projectId_idx" ON "StudioGallery"("projectId");

-- CreateIndex
CREATE INDEX "StudioGallery_status_idx" ON "StudioGallery"("status");

-- CreateIndex
CREATE INDEX "StudioGallery_galleryType_idx" ON "StudioGallery"("galleryType");

-- CreateIndex
CREATE INDEX "StudioGallery_sentAt_idx" ON "StudioGallery"("sentAt");

-- CreateIndex
CREATE INDEX "StudioGallery_expiresAt_idx" ON "StudioGallery"("expiresAt");

-- CreateIndex
CREATE INDEX "StudioGalleryMedia_galleryId_sortOrder_idx" ON "StudioGalleryMedia"("galleryId", "sortOrder");

-- CreateIndex
CREATE INDEX "StudioGalleryMedia_mediaId_idx" ON "StudioGalleryMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioGalleryMedia_galleryId_mediaId_key" ON "StudioGalleryMedia"("galleryId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCaseStudy_projectId_key" ON "WorkCaseStudy"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCaseStudy_slug_key" ON "WorkCaseStudy"("slug");

-- CreateIndex
CREATE INDEX "WorkCaseStudy_status_idx" ON "WorkCaseStudy"("status");

-- CreateIndex
CREATE INDEX "WorkCaseStudy_publishedAt_idx" ON "WorkCaseStudy"("publishedAt");

-- CreateIndex
CREATE INDEX "WorkMedia_workId_sortOrder_idx" ON "WorkMedia"("workId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkMedia_mediaId_idx" ON "WorkMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkMedia_workId_mediaId_key" ON "WorkMedia"("workId", "mediaId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_dateBucket_idx" ON "AnalyticsSnapshot"("dateBucket");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_pageType_idx" ON "AnalyticsSnapshot"("pageType");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_projectId_idx" ON "AnalyticsSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_workId_idx" ON "AnalyticsSnapshot"("workId");

-- CreateIndex
CREATE INDEX "AutomationRun_workflowName_idx" ON "AutomationRun"("workflowName");

-- CreateIndex
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- CreateIndex
CREATE INDEX "AutomationRun_startedAt_idx" ON "AutomationRun"("startedAt");

-- CreateIndex
CREATE INDEX "AutomationRule_isEnabled_idx" ON "AutomationRule"("isEnabled");

-- CreateIndex
CREATE INDEX "AutomationRule_triggerEvent_idx" ON "AutomationRule"("triggerEvent");

-- CreateIndex
CREATE INDEX "Gallery_studioProjectId_idx" ON "Gallery"("studioProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_studioLeadId_key" ON "Lead"("studioLeadId");

-- CreateIndex
CREATE INDEX "Lead_studioLeadId_idx" ON "Lead"("studioLeadId");

-- CreateIndex
CREATE INDEX "Project_studioProjectId_idx" ON "Project"("studioProjectId");

-- CreateIndex
CREATE INDEX "StudioProject_clientId_idx" ON "StudioProject"("clientId");

-- CreateIndex
CREATE INDEX "StudioProject_status_idx" ON "StudioProject"("status");

-- CreateIndex
CREATE INDEX "WorkProject_studioProjectId_idx" ON "WorkProject"("studioProjectId");

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_studioLeadId_fkey" FOREIGN KEY ("studioLeadId") REFERENCES "StudioLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_heroStudioMediaId_fkey" FOREIGN KEY ("heroStudioMediaId") REFERENCES "StudioMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLead" ADD CONSTRAINT "StudioLead_convertedClientId_fkey" FOREIGN KEY ("convertedClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLead" ADD CONSTRAINT "StudioLead_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMedia" ADD CONSTRAINT "StudioMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioGallery" ADD CONSTRAINT "StudioGallery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioGalleryMedia" ADD CONSTRAINT "StudioGalleryMedia_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "StudioGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioGalleryMedia" ADD CONSTRAINT "StudioGalleryMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "StudioMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCaseStudy" ADD CONSTRAINT "WorkCaseStudy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCaseStudy" ADD CONSTRAINT "WorkCaseStudy_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "StudioMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedia" ADD CONSTRAINT "WorkMedia_workId_fkey" FOREIGN KEY ("workId") REFERENCES "WorkCaseStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedia" ADD CONSTRAINT "WorkMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "StudioMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_workId_fkey" FOREIGN KEY ("workId") REFERENCES "WorkCaseStudy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

