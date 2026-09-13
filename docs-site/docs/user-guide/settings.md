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

### Authelia

Authelia is available in **Add Authentication Provider**. The setup below targets Authelia 4.39 or later with its OpenID Connect provider already configured. See the [Authelia OIDC provider guide](https://www.authelia.com/configuration/identity-providers/openid-connect/provider/) for signing keys, storage, and other server prerequisites.

1. Generate a client secret and its hash on your Authelia host:

   ```bash
   authelia crypto hash generate pbkdf2 --random --random.length 64 --random.charset alphanumeric
   ```

   Store the generated **Digest** in Authelia's `client_secret` and enter the original **Random Password** in VyManager. Do not enter the hash in VyManager.

2. Merge this configuration into your existing `identity_providers.oidc` section. Replace the digest placeholder and callback URL with your own values. The callback must exactly match the URL displayed by VyManager, including its scheme, host, and port.

   ```yaml
   identity_providers:
     oidc:
       claims_policies:
         vymanager:
           id_token:
             - groups
       clients:
         - client_id: vymanager
           client_name: VyManager
           client_secret: 'REPLACE_WITH_GENERATED_DIGEST'
           public: false
           authorization_policy: two_factor
           claims_policy: vymanager
           require_pkce: true
           pkce_challenge_method: S256
           redirect_uris:
             - https://vymanager.example.com/api/auth/oauth2/callback/authelia
           scopes:
             - openid
             - email
             - profile
             - groups
           grant_types:
             - authorization_code
           response_types:
             - code
           response_modes:
             - query
           token_endpoint_auth_method: client_secret_post
           id_token_signed_response_alg: RS256
   ```

   Keep existing clients and claims policies when merging. Validate and restart Authelia after applying the configuration. The example uses Authelia's two-factor policy, so users must complete their configured second factor.

3. In VyManager, choose **Authelia** and enter:

   | Field | Value |
   | --- | --- |
   | Discovery URL | `https://auth.example.com/.well-known/openid-configuration`, using your Authelia URL |
   | Client ID | `vymanager` |
   | Client Secret | The original generated random password |
   | Scopes | `openid email profile groups` |

   Save the provider, then enable it to display **Authelia** on the login page. VyManager enables PKCE by default. Its frontend and backend must both be able to reach Authelia over HTTPS and trust its certificate.

4. To use role mapping, configure rules for your Authelia group names and leave the claim name as `groups`. Create the rules before enabling role mapping. Test with a mapped account while keeping an administrator session available.

The dedicated `vymanager` claims policy includes groups in the signed ID token because VyManager's backend derives role assignments from that token. Requesting the `groups` scope alone is insufficient for backend role reconciliation. This policy is needed only when using role mapping; ordinary login can omit `claims_policy` and the corresponding policy definition. See [Authelia claims policies](https://www.authelia.com/configuration/identity-providers/openid-connect/provider/#claims_policies).

Mappings apply on each login. An unmatched user is denied when role mapping is enabled. For a user who still matches a rule after their groups change, the next successful login updates their SSO-managed grants.

Troubleshooting:

- **Redirect URI rejected:** copy the callback URL from VyManager again and check the public application URL configured for VyManager.
- **Client authentication rejected:** use the original secret in VyManager, its digest in Authelia, and `client_secret_post` on the Authelia client. Authelia's default `client_secret_basic` differs from VyManager's token exchange method.
- **Login denied or mapped permissions missing:** check group names, the `groups` scope on both sides, and the client's `claims_policy`. Ensure the policy includes `groups` in `id_token`, then sign in again.
- **Profile or email missing:** ensure the Authelia account has an email address and that the client permits the `email` and `profile` scopes.

For configuration details, see [Authelia clients](https://www.authelia.com/configuration/identity-providers/openid-connect/clients/) and [secret generation](https://www.authelia.com/reference/cli/authelia/authelia_crypto_hash_generate_pbkdf2/).
