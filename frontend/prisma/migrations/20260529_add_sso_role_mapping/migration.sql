-- AlterTable: add SSO group/role mapping config to providers
ALTER TABLE "oauth_providers"
    ADD COLUMN IF NOT EXISTS "roleMappingEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "groupsClaim" TEXT;

-- CreateTable: per-claim role mapping rules
CREATE TABLE IF NOT EXISTS "oauth_role_mappings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "claimValue" TEXT NOT NULL,
    "siteRole" "Role",
    "instanceId" TEXT,
    "instanceRole" "InstanceRole",
    "featurePermissions" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_role_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_role_mappings_providerId_claimValue_instanceId_key"
    ON "oauth_role_mappings"("providerId", "claimValue", "instanceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oauth_role_mappings_providerId_idx"
    ON "oauth_role_mappings"("providerId");

-- AddForeignKey
ALTER TABLE "oauth_role_mappings"
    ADD CONSTRAINT "oauth_role_mappings_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "oauth_providers"("providerId")
    ON DELETE CASCADE ON UPDATE CASCADE;
