-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_isDemo_expiresAt_idx" ON "organizations"("isDemo", "expiresAt");

-- CreateTable: org_members
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_members_orgId_userId_key" ON "org_members"("orgId", "userId");
CREATE INDEX "org_members_userId_idx" ON "org_members"("userId");

-- AddColumn: isDemo to users
ALTER TABLE "users" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn: orgId to sites (nullable initially for data migration)
ALTER TABLE "sites" ADD COLUMN "orgId" TEXT;

-- Drop old unique constraint/index on sites.name
ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "sites_name_key";
DROP INDEX IF EXISTS "sites_name_key";

-- Data Migration: Create a default organization for existing data
INSERT INTO "organizations" ("id", "name", "slug", "description", "isDemo", "createdAt", "updatedAt")
VALUES ('default-org', 'Default', 'default', 'Default organization', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign all existing sites to the default org
UPDATE "sites" SET "orgId" = 'default-org' WHERE "orgId" IS NULL;

-- Create org_members for all existing users -> default org
INSERT INTO "org_members" ("id", "orgId", "userId", "role", "createdAt")
SELECT
    'om-' || "id",
    'default-org',
    "id",
    'OWNER'::"OrgRole",
    CURRENT_TIMESTAMP
FROM "users";

-- Make orgId non-nullable now that all rows have values
ALTER TABLE "sites" ALTER COLUMN "orgId" SET NOT NULL;

-- Add new unique constraint and index
CREATE UNIQUE INDEX "sites_orgId_name_key" ON "sites"("orgId", "name");
CREATE INDEX "sites_orgId_idx" ON "sites"("orgId");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
