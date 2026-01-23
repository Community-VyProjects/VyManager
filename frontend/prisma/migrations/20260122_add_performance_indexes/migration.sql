-- Add composite indexes for improved query performance

-- Index for filtering active instances by site
CREATE INDEX IF NOT EXISTS "instances_siteId_isActive_idx" ON "instances"("siteId", "isActive");

-- Index for finding pending scheduled power actions
CREATE INDEX IF NOT EXISTS "scheduled_power_actions_scheduledTime_cancelled_idx" ON "scheduled_power_actions"("scheduledTime", "cancelled");
