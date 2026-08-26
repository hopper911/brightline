-- CreateTable
CREATE TABLE "DesignProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "brief" TEXT,
    "approach" TEXT,
    "outcome" TEXT,
    "year" INTEGER,
    "clientName" TEXT,
    "role" TEXT,
    "disciplines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "coverMediaId" TEXT,
    "specimenBlocks" JSONB NOT NULL DEFAULT '[]',
    "relatedWorkProjectId" TEXT,
    "relatedServicesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "relatedServicesIntro" TEXT,
    "relatedServicesLinks" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesignProject_slug_key" ON "DesignProject"("slug");

-- CreateIndex
CREATE INDEX "DesignProject_published_idx" ON "DesignProject"("published");

-- CreateIndex
CREATE INDEX "DesignProject_featured_sortOrder_idx" ON "DesignProject"("featured", "sortOrder");

-- CreateIndex
CREATE INDEX "DesignProject_relatedWorkProjectId_idx" ON "DesignProject"("relatedWorkProjectId");

-- AddForeignKey
ALTER TABLE "DesignProject" ADD CONSTRAINT "DesignProject_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignProject" ADD CONSTRAINT "DesignProject_relatedWorkProjectId_fkey" FOREIGN KEY ("relatedWorkProjectId") REFERENCES "WorkProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
