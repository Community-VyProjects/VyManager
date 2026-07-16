---
id: organizations
title: Organization groundwork
sidebar_position: 6
---

# Organization groundwork

VyManager is growing an organization layer above sites: users will belong to
one or more organizations with org-level roles, sites will live inside an
organization, and per-instance RBAC will keep working exactly as today but
fenced within the org. The groundwork for this is landing incrementally and
is deliberately **inert**: nothing changes for any deployment until an
explicit enforcement switch turns on in a future release, and single-team
deployments will never see the org layer at all.

This page documents what already exists, because parts of it are visible in
the schema and useful during upgrades.

## Data model

Three schema elements exist today:

- `organizations` — a fixed `default` organization is created by the
  migration.
- `org_memberships` — every user is a member of the default org. Deployment
  admins (`users.role = ADMIN`) were backfilled as org `ADMIN`s, everyone
  else as `MEMBER`, and the earliest-created admin holds the org `OWNER`
  role. The deployment-wide `users.role` is untouched and remains what it
  always was; in org terminology that account is the **System
  Administrator** — the operator who sees all organizations and manages the
  deployment itself.
- `sites.orgId` — every site belongs to an organization; existing and new
  sites land in the default org automatically.

The migration is transparent: no admin action, no permission changes. The
[permission equivalence check](../operations/upgrades.md#verifying-an-upgrade)
exists to let you prove that on your own deployment.

## Org-scoped database access

Every backend database unit of work runs inside a transaction that carries
the request's organization context as PostgreSQL settings (`app.org_id`,
`app.is_system_admin`), applied with `SET LOCAL` so they die with the
transaction. Today nothing filters on them; they are the substrate that
row-level security will key on when enforcement lands, giving deny-by-default
scoping even for a handler that forgets to filter.

The org context is derived, not stored: the active instance determines the
organization (instance → site → org), so feature pages never need to know
organizations exist. Admin endpoints that operate without an active instance
(site listing, user management, tokens, backup) accept an optional `org_id`
query parameter that must name an organization the caller belongs to; when
omitted it defaults to the caller's sole organization, which today is always
the default org.

A build-failing test (the "canary") keeps this boundary honest: any backend
file that resolves a database connection outside the sanctioned org-scoped
path fails the suite unless it is on a reviewed allowlist that carries a
justification per entry.

## The Golden Rule (frontend cannot write authorization tables)

Authorization tables — `org_memberships`, `user_instance_roles`,
`user_feature_permissions`, `organizations` — are backend/migration owned. The
frontend must not be able to write them, so a compromised frontend cannot mint
grants or memberships. This is enforced structurally at the database: the
frontend's Postgres role is granted write access only to the Better Auth core
tables and nothing else. A proof in the adversarial suite connects as such a
role and asserts every authz-table write fails at the grant level.

When you separate the frontend's database role (recommended alongside
enforcement), grant it narrowly:

```sql
GRANT USAGE ON SCHEMA public TO vym_frontend;
GRANT SELECT, INSERT, DELETE ON users TO vym_frontend;
-- UPDATE on users is column-scoped: everything EXCEPT role. The site-admin
-- bit is backend-owned (/internal/sso-reconcile applies it), so a
-- compromised frontend cannot self-promote. role is still set at INSERT
-- (first-user promotion, SSO mapping at creation) — creation-time only.
GRANT UPDATE (name, email, "emailVerified", image, "createdAt", "updatedAt")
    ON users TO vym_frontend;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions, accounts, verifications
    TO vym_frontend;
-- No grant on org_memberships / user_instance_roles /
-- user_feature_permissions / organizations / oauth_role_mappings / sites /
-- instances: the frontend never writes them (oauth config and role
-- mappings write via backend endpoints since #484/#487).
```

Verify the live role after the switch with
`DATABASE_URL=<frontend-role-url> python -m scripts.prove_runtime_role`,
which also asserts `users.role` is not updatable.

## Row-level security (foundation in place, inert)

The database carries row-level-security policies on the organization-hierarchy
tables (`organizations`, `sites`, `org_memberships`, `instances`), keyed on the
request's `app.org_id` with an operator bypass on `app.is_system_admin` — the
same settings the org-scoped connections apply. RLS is `ENABLE`d but not
`FORCE`d, so the table owner (the role the app connects as today) bypasses it
entirely: **the policies are inert until the app connects as a separate,
low-privilege runtime role at the enforcement flip.**

That runtime role is created out of band — it needs a login credential and
`CREATEROLE`, which the app's own database role usually lacks — so it is not
created by the migration. When you are ready to enforce, create it and grant
least privilege (audit logs stay append-only):

```sql
CREATE ROLE vym_runtime LOGIN PASSWORD '…';
GRANT USAGE ON SCHEMA public TO vym_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vym_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vym_runtime;
REVOKE UPDATE, DELETE ON "audit_logs" FROM vym_runtime;  -- append-only
```

## Enabling enforcement (operator runbook)

Enforcement is opt-in and off by default. When you are ready to turn the org
boundary on for a deployment, in order:

1. Create the low-privilege runtime role and grant it least privilege (the SQL
   under "Row-level security" above), keeping `audit_logs` append-only.
2. `FORCE` row-level security so the app — connecting as the non-owning runtime
   role — is subject to the policies:

   ```sql
   ALTER TABLE organizations           FORCE ROW LEVEL SECURITY;
   ALTER TABLE sites                   FORCE ROW LEVEL SECURITY;
   ALTER TABLE org_memberships         FORCE ROW LEVEL SECURITY;
   ALTER TABLE instances               FORCE ROW LEVEL SECURITY;
   ALTER TABLE user_instance_roles     FORCE ROW LEVEL SECURITY;
   ALTER TABLE user_feature_permissions FORCE ROW LEVEL SECURITY;
   ```

3. Point the backend's `DATABASE_URL` at the `vym_runtime` role (Prisma keeps
   migrating as the owner via its own connection string).
4. Set `ORG_ENFORCEMENT=1` on the backend.

The context that RLS keys on is derived per request: the identity/instance
resolution reads run with a short, user-scoped operator bypass so they can
find *which* org before the policies apply, then every handler query runs
under the real org context. The System Administrator (`users.role=ADMIN`)
bypasses org isolation; org `ADMIN`/`OWNER` members get full access on their
own org's instances; everyone else is confined to their grants.

## Status

Organization management UI and APIs (create/rename/delete organizations and
manage their memberships, System Administrator only), the fenced-role
connection, `FORCE` RLS, and org-scoped enforcement have all shipped. The
capability is complete and gated by the adversarial suite, which asserts the
org-role semantics **under enforcement** on every CI run — the cross-org
negatives and the org-role target-state checks are strict now, no longer
expected-fail.

Enforcement remains **opt-in and off by default** (the operator runbook above
turns it on for a deployment); with it off, everything is inert and single-team
deployments are unaffected. The end-to-end flip — fenced `vym_runtime` role,
`FORCE` RLS on the six protected tables, and org creation/membership/site/
instance access through that role — has been rehearsed and verified, as has SSO
role mapping against a live OIDC provider (a permitted group signs in with the
mapped role; a non-permitted account is denied).
