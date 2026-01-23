-- Create enum for metric types
CREATE TYPE "MetricType" AS ENUM ('CPU', 'MEMORY', 'DISK', 'INTERFACE_RX', 'INTERFACE_TX', 'CONNTRACK');

-- Create metrics_history table
CREATE TABLE "metrics_history" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "MetricType" NOT NULL,
    "name" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_history_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX "metrics_history_instanceId_type_timestamp_idx" ON "metrics_history"("instanceId", "type", "timestamp");
CREATE INDEX "metrics_history_instanceId_type_name_timestamp_idx" ON "metrics_history"("instanceId", "type", "name", "timestamp");
