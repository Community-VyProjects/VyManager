-- Create AlertType enum
CREATE TYPE "AlertType" AS ENUM (
    'INTERFACE_DOWN',
    'HIGH_CPU',
    'HIGH_MEMORY',
    'HIGH_DISK',
    'CONNECTION_THRESHOLD',
    'INTERFACE_ERRORS',
    'BGP_NEIGHBOR_DOWN',
    'IPSEC_TUNNEL_DOWN',
    'OPENVPN_TUNNEL_DOWN',
    'WIREGUARD_PEER_DOWN'
);

-- Create AlertSeverity enum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- Create alert_rules table
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "telegramChatId" TEXT,
    "telegramBotToken" TEXT,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 300,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- Create alert_history table
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "alert_rules_instanceId_enabled_idx" ON "alert_rules"("instanceId", "enabled");
CREATE INDEX "alert_rules_createdBy_idx" ON "alert_rules"("createdBy");

CREATE INDEX "alert_history_instanceId_triggeredAt_idx" ON "alert_history"("instanceId", "triggeredAt");
CREATE INDEX "alert_history_instanceId_acknowledged_idx" ON "alert_history"("instanceId", "acknowledged");
CREATE INDEX "alert_history_ruleId_idx" ON "alert_history"("ruleId");

-- Add foreign key constraint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
