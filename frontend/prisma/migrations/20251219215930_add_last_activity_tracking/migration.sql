-- AlterTable
ALTER TABLE "active_sessions" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "active_sessions_lastActivityAt_idx" ON "active_sessions"("lastActivityAt");
