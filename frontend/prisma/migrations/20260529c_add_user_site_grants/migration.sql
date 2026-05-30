-- Whole-site grants for user access (alongside per-instance grants).

-- A row may now grant a site instead of an instance, so instanceId is optional.
ALTER TABLE "user_instance_roles" ALTER COLUMN "instanceId" DROP NOT NULL;

ALTER TABLE "user_instance_roles" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- FK to sites, cascade so removing a site clears its grants.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_instance_roles_siteId_fkey'
  ) THEN
    ALTER TABLE "user_instance_roles"
      ADD CONSTRAINT "user_instance_roles_siteId_fkey"
      FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- At most one whole-site grant per (user, site).
CREATE UNIQUE INDEX IF NOT EXISTS "user_instance_roles_userId_siteId_key"
  ON "user_instance_roles"("userId", "siteId");

CREATE INDEX IF NOT EXISTS "user_instance_roles_siteId_idx"
  ON "user_instance_roles"("siteId");
