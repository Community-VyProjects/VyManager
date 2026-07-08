-- Real context columns for audit logs. Previously the instance was only
-- recorded inside the JSON details blob; the org/site were not captured at
-- all. Additive and nullable — old rows and non-instance actions leave them
-- null. The actor stays in the existing userId/userEmail columns.
ALTER TABLE "audit_logs"
    ADD COLUMN "orgId" TEXT,
    ADD COLUMN "siteId" TEXT,
    ADD COLUMN "instanceId" TEXT;

CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");
CREATE INDEX "audit_logs_instanceId_idx" ON "audit_logs"("instanceId");
