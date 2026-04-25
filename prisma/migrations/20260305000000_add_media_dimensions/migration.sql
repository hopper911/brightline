-- CreateEnum
CREATE TYPE "MediaOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "aspectRatio" DOUBLE PRECISION,
ADD COLUMN     "orientation" "MediaOrientation";
