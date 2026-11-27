-- The pending commit-confirm per router (#1701, #1702). The row belongs to the
-- router (deviceKey), not to the instance row it was started from, so deleting
-- that instance keeps it for the other rows on the router.
CREATE TABLE "commit_confirm_sessions" (
    "deviceKey" TEXT NOT NULL,
    "instanceId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmMinutes" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "startedById" TEXT,
    "startedByName" TEXT,
    "startedByOrgId" TEXT,
    "unsavedBefore" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "commit_confirm_sessions_pkey" PRIMARY KEY ("deviceKey"),
    CONSTRAINT "commit_confirm_sessions_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "instances"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- The RLS foundation granted the runtime role the tables that existed then.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vym_runtime') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON "commit_confirm_sessions" TO vym_runtime';
    END IF;
END
$$;
