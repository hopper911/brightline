
- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "opening" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "highlight" TEXT NOT NULL,
    "execution" TEXT,
    "closing" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "heroImageId" TEXT,
    "gallery" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioProject_slug_key" ON "StudioProject"("slug");

-- CreateIndex
CREATE INDEX "StudioProject_published_idx" ON "StudioProject"("published");

-- CreateIndex
CREATE INDEX "StudioProject_featured_idx" ON "StudioProject"("featured");

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
