-- Organization layer, additive and inert: nothing reads these tables yet.
-- Create + backfill + constrain happen in this one migration so it is valid
-- on both an empty database (fresh install) and a populated one (upgrade).

CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

CREATE TABLE "org_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orgRole" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "org_memberships_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId")
        REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "org_memberships_userId_orgId_key"
    ON "org_memberships"("userId", "orgId");
CREATE INDEX "org_memberships_orgId_idx" ON "org_memberships"("orgId");

-- Default organization with a fixed id: sites carry a column DEFAULT that
-- points at it, so fresh installs create their first site before any org
-- management exists. The DEFAULT is scaffolding for the inert phase and is
-- removed when org enforcement turns on.
INSERT INTO "organizations" ("id", "name", "createdAt", "updatedAt")
VALUES ('default', 'Default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- sites.orgId: add nullable, backfill every existing site to the default
-- org, then constrain.
ALTER TABLE "sites" ADD COLUMN "orgId" TEXT;

UPDATE "sites" SET "orgId" = 'default';

ALTER TABLE "sites"
    ALTER COLUMN "orgId" SET NOT NULL,
    ALTER COLUMN "orgId" SET DEFAULT 'default',
    ADD CONSTRAINT "sites_orgId_fkey" FOREIGN KEY ("orgId")
        REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "sites_orgId_idx" ON "sites"("orgId");

-- Membership backfill. Deterministic ids derived from user ids: re-runnable
-- by inspection and no dependency on any uuid extension. Deployment ADMINs
-- become org ADMINs of the default org; everyone else a MEMBER. users.role
-- itself is untouched.
INSERT INTO "org_memberships" ("id", "userId", "orgId", "orgRole", "createdAt", "updatedAt")
SELECT 'om_' || u."id",
       u."id",
       'default',
       CASE WHEN u."role" = 'ADMIN' THEN 'ADMIN' ELSE 'MEMBER' END::"OrgRole",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "users" u;

-- Every org with members needs an OWNER. The earliest-created deployment
-- ADMIN takes it; if users exist but no ADMIN does (interrupted first-user
-- promotion), the earliest user takes it. An empty database (fresh install)
-- backfills no memberships and designates no OWNER, which is valid.
UPDATE "org_memberships" SET "orgRole" = 'OWNER'
WHERE "userId" = (SELECT "id" FROM "users" WHERE "role" = 'ADMIN'
                  ORDER BY "createdAt", "id" LIMIT 1);

UPDATE "org_memberships" SET "orgRole" = 'OWNER'
WHERE NOT EXISTS (SELECT 1 FROM "org_memberships" WHERE "orgRole" = 'OWNER')
  AND "userId" = (SELECT "id" FROM "users" ORDER BY "createdAt", "id" LIMIT 1);

-- Vestigial since the custom-roles removal: declared in the schema, never
-- read or written by frontend or backend, excluded from backups.
DROP TABLE IF EXISTS "role_permissions";
DROP TYPE IF EXISTS "Action";
