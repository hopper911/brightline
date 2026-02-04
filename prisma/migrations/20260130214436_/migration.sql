-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "internalNotes" TEXT;

-- AlterTable
ALTER TABLE "GalleryAccessToken" ADD COLUMN     "allowDownload" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "maxDownloads" INTEGER;

-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN     "filename" TEXT;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GalleryAccessLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "imageId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryFavorite" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryDownload" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "imageId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'single',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "GalleryAccessLog_tokenId_idx" ON "GalleryAccessLog"("tokenId");

-- CreateIndex
CREATE INDEX "GalleryAccessLog_createdAt_idx" ON "GalleryAccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "GalleryFavorite_tokenId_idx" ON "GalleryFavorite"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryFavorite_tokenId_imageId_key" ON "GalleryFavorite"("tokenId", "imageId");

-- CreateIndex
CREATE INDEX "GalleryDownload_tokenId_idx" ON "GalleryDownload"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "GalleryAccessLog" ADD CONSTRAINT "GalleryAccessLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryDownload" ADD CONSTRAINT "GalleryDownload_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
