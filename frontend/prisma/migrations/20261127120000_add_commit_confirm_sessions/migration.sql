-- The pending commit-confirm per router (#1701, #1702).
CREATE TABLE "commit_confirm_sessions" (
    "deviceKey" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmMinutes" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "startedById" TEXT,
    "startedByName" TEXT,
    "startedByOrgId" TEXT,

    CONSTRAINT "commit_confirm_sessions_pkey" PRIMARY KEY ("deviceKey"),
    CONSTRAINT "commit_confirm_sessions_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "instances"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
