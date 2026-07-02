---
id: settings
title: Settings and administration
sidebar_position: 13
---

# Settings and administration

The Settings page itself contains power management for the connected router: schedule a reboot or poweroff — immediately, at a time, or in N minutes. Scheduled actions show a countdown banner on every page with a cancel button.

Administration of VyManager itself — users, tokens, single sign-on — lives in the Site Manager's left rail (see [Sites](sites)), because it is independent of any connected instance. These sections require the global ADMIN role; the backend rejects changes from anyone else.

## User management

The Users tab lists VyManager accounts with their global role (ADMIN or VIEWER), instance count, and create/edit/delete dialogs. **Manage Access** per user sets the global role and, for viewers, the instance and site grants: whole-site or per-instance, with an instance role (Admin, Operator, Viewer) and — for Operator/Viewer — the feature-by-feature permission set. Grants support bulk edit and delete. Grants that came from SSO role mapping are shown locked; they are managed in the provider's role mapping instead.

The Instances tab is a read-only overview of all instances grouped by site, with a per-instance view of who has access.

See [RBAC and permissions](../architecture/rbac) for how the roles are enforced.

## API tokens

Personal access tokens for non-browser clients. Each token has a name, optional expiry (30/90/365 days or never), a read-only flag (default on), and an access restriction: all your instances, specific sites, or specific instances. The token value is shown once at creation. Tokens act as you and never exceed your own permissions; they can be revoked at any time. Usage details are in [Sessions and authentication](../architecture/sessions-and-auth#api-tokens).

## Authentication (SSO)

External OAuth/OIDC login providers: add from a list of known providers or configure a custom one, set the client credentials, and enable or disable per provider. The login page picks up enabled providers automatically.

**Role mapping** assigns VyManager access from the provider's group claims: name the claim (default `groups`), then map each group value to a global role (Admin or Viewer) and, for non-admin groups, to instance/site grants with feature permissions. Mappings are evaluated on every login. With role mapping enabled, users matching no rule are denied — the page warns about this.
