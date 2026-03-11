/*
  Warnings:

  - You are about to drop the column `aspectRatio` on the `MediaAsset` table. All the data in the column will be lost.
  - You are about to drop the column `orientation` on the `MediaAsset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "budget" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "timeline" TEXT;

-- AlterTable
ALTER TABLE "MediaAsset" DROP COLUMN "aspectRatio",
DROP COLUMN "orientation";

-- DropEnum
DROP TYPE "MediaOrientation";
