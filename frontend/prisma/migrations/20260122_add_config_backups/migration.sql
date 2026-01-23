-- CreateTable: ConfigBackup for storing configuration snapshots
CREATE TABLE IF NOT EXISTS "config_backups" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "configSize" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: For efficient lookup by instance and creation time
CREATE INDEX IF NOT EXISTS "config_backups_instanceId_createdAt_idx" ON "config_backups"("instanceId", "createdAt");

-- CreateIndex: For efficient lookup by creator
CREATE INDEX IF NOT EXISTS "config_backups_createdBy_idx" ON "config_backups"("createdBy");

-- AddForeignKey: Link to instances table with cascade delete
ALTER TABLE "config_backups" ADD CONSTRAINT "config_backups_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
