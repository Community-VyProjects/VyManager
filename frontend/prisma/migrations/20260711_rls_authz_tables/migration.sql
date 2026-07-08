-- Extend the RLS foundation (20260710) to the per-user authorization tables.
-- Still ENABLE, not FORCE, so the table owner (the running app today) bypasses
-- these entirely — inert until the enforcement flip. Same keying: the request's
-- app.org_id with an app.is_system_admin operator bypass.

-- A grant is in an org via its instance's site, or via its whole-site grant.
ALTER TABLE "user_instance_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "user_instance_roles" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "instanceId" IN (
        SELECT i."id" FROM "instances" i
        JOIN "sites" s ON i."siteId" = s."id"
        WHERE s."orgId" = current_setting('app.org_id', true)
    )
    OR "siteId" IN (
        SELECT "id" FROM "sites"
        WHERE "orgId" = current_setting('app.org_id', true)
    )
);

-- A feature permission inherits its grant's org (via instance or whole-site).
ALTER TABLE "user_feature_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON "user_feature_permissions" USING (
    current_setting('app.is_system_admin', true) = 'true'
    OR "userInstanceRoleId" IN (
        SELECT uir."id" FROM "user_instance_roles" uir
        LEFT JOIN "instances" i ON uir."instanceId" = i."id"
        LEFT JOIN "sites" si ON i."siteId" = si."id"
        LEFT JOIN "sites" ss ON uir."siteId" = ss."id"
        WHERE COALESCE(si."orgId", ss."orgId")
              = current_setting('app.org_id', true)
    )
);

-- Intentionally NOT org-policied here:
--   api_tokens         — user-owned, no org column; confined to the owner's
--                        org at creation (see the token-confinement change).
--                        Row-level org isolation needs a per-user setting and
--                        is deferred.
--   oauth_role_mappings — SSO is deployment-global (RFC §9), so these rules
--                        are not org-scoped.
