-- Phase 8C: single-use SSO exchange nonces (cross-domain staff SSO)

CREATE TABLE "platform_sso_exchange_nonces" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_sso_exchange_nonces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_sso_exchange_nonces_nonce_key" ON "platform_sso_exchange_nonces"("nonce");
CREATE INDEX "platform_sso_exchange_nonces_expiresAt_idx" ON "platform_sso_exchange_nonces"("expiresAt");
CREATE INDEX "platform_sso_exchange_nonces_audience_consumedAt_idx" ON "platform_sso_exchange_nonces"("audience", "consumedAt");
