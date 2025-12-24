-- CreateTable
CREATE TABLE "scheduled_power_actions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "scheduledBy" TEXT NOT NULL,
    "scheduledByName" TEXT NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledBy" TEXT,
    "cancelledByName" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_power_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_power_actions_instanceId_idx" ON "scheduled_power_actions"("instanceId");

-- CreateIndex
CREATE INDEX "scheduled_power_actions_scheduledTime_idx" ON "scheduled_power_actions"("scheduledTime");
