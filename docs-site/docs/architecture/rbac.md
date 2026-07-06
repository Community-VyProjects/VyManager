---
id: rbac
title: RBAC and permissions
sidebar_position: 4
---

# RBAC and permissions

Access control has two tiers: a global role on the user account, and per-instance roles with optional feature-level permissions.

## Global role

`users.role` is either `ADMIN` or `VIEWER`. A global ADMIN is a super admin: they bypass all permission checks, see every site and instance, and are the only ones who can manage users, sites, instances and permission grants. The first account created during onboarding gets this role.

Everyone else starts with no access. What they can do is defined entirely by grants.

## Instance grants

A grant (`user_instance_roles`) ties a user to either one instance or a whole site — a site grant covers every instance in the site, including instances added later. Each grant carries a role:

| Role | Effect |
|---|---|
| `ADMIN` | Full write access to all VyOS features on the granted instance(s) |
| `OPERATOR` | Access only to the features listed in the grant's feature permissions, with per-feature read or write |
| `VIEWER` | Read-only access to the features listed in the grant's feature permissions |

(`EDITOR` still exists in the database enum for compatibility; it is deprecated in favor of `OPERATOR`.)

If a user holds multiple grants that reach the same instance (for example an instance grant and a site grant), the highest role wins: ADMIN over OPERATOR over VIEWER.

## Feature permissions

For OPERATOR and VIEWER grants, `user_feature_permissions` rows list the allowed features with `canView`/`canEdit` flags. Features come from the `FeatureGroup` taxonomy in `backend/rbac_permissions.py` — roughly 100 keys covering every dashboard area, from broad parents (`FIREWALL`, `ROUTING`, `VPN`, `SERVICE`) down to individual pages (`FIREWALL_ZONES`, `BGP`, `WIREGUARD`, `SSH_CONSOLE`).

Parents propagate to children: granting `ROUTING` grants `BGP`, `OSPF`, `STATIC_ROUTES` and the rest of the routing subtree at the same level. Permission levels are `NONE`, `READ`, `WRITE`.

For interface types with their own feature group (`PSEUDO_ETHERNET`, `VIRTUAL_ETHERNET`, `VPP`, `VTI`, `WIRELESS`, `WWAN`), the endpoint checks the dedicated group, and `INTERFACES` acts as a fallback: a role holding either the dedicated grant or `INTERFACES` gets access, so granting only `INTERFACES` still covers every interface type.

## Enforcement

Every feature endpoint calls `require_read_permission` or `require_write_permission` with its feature group before doing anything. The check order is:

1. Not authenticated → 401.
2. Request authenticated with a read-only API token and the operation is a write → 403. This runs before the admin bypass, so even an admin's read-only token cannot write.
3. Global ADMIN → allowed.
4. No active instance → 404.
5. Otherwise the user's effective permission for the feature on the active instance is computed from their grants; insufficient level → 403.

Administrative endpoints (user management, sites and instances, token administration) instead require the global ADMIN role outright.

## The permissions endpoint

`GET /vyos/permissions` returns the caller's effective permission level for every feature group on their active instance. The frontend fetches this after connecting to an instance and hides or disables UI the user cannot use. Hiding is cosmetic; the backend check on each endpoint is the enforcement.
