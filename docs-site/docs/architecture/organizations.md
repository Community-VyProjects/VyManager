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

## What is deliberately not here yet

Organization management UI and APIs, org-scoped enforcement, row-level
security and the related security hardening ship in later releases, each
gated by an adversarial test suite that already runs today (cross-org
negatives execute on every CI run; the target-state expectations are marked
expected-fail until enforcement turns on).
