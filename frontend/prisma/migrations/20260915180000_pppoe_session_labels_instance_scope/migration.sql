-- Recreate the PPPoE label catalog as instance-scoped overlay metadata
-- (same class as firewall_separators). The previous table was global: rows
-- cannot be attributed to a tenant, so they are dropped.

DROP TABLE IF EXISTS "pppoe_session_label_definitions";

CREATE TABLE "pppoe_session_label_definitions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(40) NOT NULL DEFAULT 'info',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pppoe_session_label_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pppoe_session_label_definitions_instanceId_code_key"
    ON "pppoe_session_label_definitions"("instanceId", "code");
CREATE INDEX "pppoe_session_label_definitions_instanceId_idx"
    ON "pppoe_session_label_definitions"("instanceId");
