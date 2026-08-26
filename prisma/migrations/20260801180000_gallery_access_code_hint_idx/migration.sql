-- Gallery access code lookup by hint (avoids full-table scan on login).
CREATE INDEX IF NOT EXISTS "GalleryAccessToken_isActive_codeHint_idx"
ON "GalleryAccessToken"("isActive", "codeHint");
