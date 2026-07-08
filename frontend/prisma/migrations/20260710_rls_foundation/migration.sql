-- Row-level-security foundation, inert by design.
--
-- Policies are keyed on the request's org context (app.org_id) with an
-- operator bypass (app.is_system_admin), both set as SET LOCAL by the
-- org_conn plumbing. RLS is ENABLEd but NOT FORCEd, so the table owner — the
-- role Prisma and the app connect as today — bypasses it entirely. Nothing
-- changes for the running app until it connects as a separate low-privilege
-- runtime role (the enforcement flip), at which point these policies become
-- the deny-by-default backstop.
--
-- The low-privilege runtime role itself is created out of band (it needs a
-- login credential and CREATEROLE, which the app's own DB role usually lacks),
-- so it is NOT created here — a migration that tried would fail on most
-- deployments. The exact ops SQL is in the PR / docs. This migration only
-- (a) enables RLS + policies, which the table owner can always do, and
-- (b) grants least privilege to the runtime role IF it already exists.

-- ---------------------------------------------------------------------------
-- Org policies (SELECT/ALL) on the org-hierarchy tables
-- ---------------------------------------------------------------------------

-- current_setting(..., true) is missing-ok: returns NULL when unset. An empty
-- app.org_id (the no-context sentinel) matches no real orgId, so a non-operator
-- request with no org context sees nothing — deny by default.

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "organizations" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "id" = current_setting('app.org_id', true)
);

ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "sites" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "orgId" = current_setting('app.org_id', true)
);

ALTER TABLE "org_memberships" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "org_memberships" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "orgId" = current_setting('app.org_id', true)
);

ALTER TABLE "instances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "instances" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "siteId" IN (
        SELECT "id" FROM "sites"
        WHERE "orgId" = current_setting('app.org_id', true)
    )
);

-- ---------------------------------------------------------------------------
-- Least-privilege grants to the runtime role, only if it already exists.
-- audit_logs is append-only: SELECT + INSERT, never UPDATE/DELETE.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vym_runtime') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA public TO vym_runtime';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vym_runtime';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vym_runtime';
        -- Append-only audit: revoke mutation, keep read + insert.
        EXECUTE 'REVOKE UPDATE, DELETE ON "audit_logs" FROM vym_runtime';
    END IF;
END $$;
