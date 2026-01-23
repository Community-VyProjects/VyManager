-- CreateIndex
-- Index for faster user session lookups (used by auth middleware and session cleanup)
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
