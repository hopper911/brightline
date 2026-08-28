-- Platform central identity (Phase 8A) — additive only

CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
CREATE TYPE "PlatformMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

CREATE TABLE "platform_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "PlatformMembershipRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_memberships_userId_tenantId_key" ON "platform_memberships"("userId", "tenantId");

CREATE INDEX "platform_memberships_tenantId_role_idx" ON "platform_memberships"("tenantId", "role");

ALTER TABLE "platform_memberships" ADD CONSTRAINT "platform_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_memberships" ADD CONSTRAINT "platform_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "platform_legacy_identity_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legacyKind" TEXT NOT NULL,
    "legacyRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_legacy_identity_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_legacy_identity_links_legacyKind_legacyRefId_key" ON "platform_legacy_identity_links"("legacyKind", "legacyRefId");

CREATE INDEX "platform_legacy_identity_links_userId_idx" ON "platform_legacy_identity_links"("userId");

ALTER TABLE "platform_legacy_identity_links" ADD CONSTRAINT "platform_legacy_identity_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
