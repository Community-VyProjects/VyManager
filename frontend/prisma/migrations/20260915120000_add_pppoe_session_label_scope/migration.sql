CREATE TABLE IF NOT EXISTS "pppoe_session_label_definitions" (
    "id" TEXT NOT NULL,
    "sessionLabel" TEXT NOT NULL DEFAULT '*',
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

ALTER TABLE "pppoe_session_label_definitions"
    ADD COLUMN IF NOT EXISTS "sessionLabel" TEXT NOT NULL DEFAULT '*';

DROP INDEX IF EXISTS "pppoe_session_label_definitions_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "pppoe_session_label_definitions_sessionLabel_code_key"
    ON "pppoe_session_label_definitions"("sessionLabel", "code");
CREATE INDEX IF NOT EXISTS "pppoe_session_label_definitions_sessionLabel_idx"
    ON "pppoe_session_label_definitions"("sessionLabel");