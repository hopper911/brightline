-- Platform foundation (Phase 1A): additive tenant registry table.
-- No FKs to legacy tables; no data movement from existing models.

CREATE TABLE "platform_tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_tenants_slug_key" ON "platform_tenants"("slug");

-- Idempotent seed for initial tenants (safe on re-deploy).
INSERT INTO "platform_tenants" ("id", "slug", "name", "createdAt", "updatedAt")
VALUES
  ('clplatformtenant000brightline', 'brightline', 'Brightline Photography', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('clplatformtenant0000mirotech', 'mirotech', 'MiroTech Solutions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;
