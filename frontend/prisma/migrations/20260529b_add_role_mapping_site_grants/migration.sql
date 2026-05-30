-- AlterTable: site-wide grants for SSO role mapping (issue #359)
ALTER TABLE "oauth_role_mappings"
    ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- CreateIndex: at most one grant per (provider, claim, site)
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_role_mappings_providerId_claimValue_siteId_key"
    ON "oauth_role_mappings"("providerId", "claimValue", "siteId");
