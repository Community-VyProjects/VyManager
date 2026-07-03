---
id: authentication
title: Authentication
sidebar_position: 1
---

# Authentication

Two ways to authenticate against the backend API.

## Browser session

The web UI logs in through the frontend (Better Auth) and receives the signed `better-auth.session_token` cookie. The frontend's proxy routes forward that cookie to the backend, which verifies the signature and loads the session. Sessions expire on inactivity (default 30 minutes, see [Sessions and authentication](../architecture/sessions-and-auth)). This flow is what the UI uses; scripts should use API tokens instead.

## API tokens

Create a token in Site Manager under API Tokens (see [Settings and administration](../user-guide/settings#api-tokens)). Send it as a bearer token:

```bash
curl -H "Authorization: Bearer vym_..." \
     -H "X-VyOS-Instance-Id: <instance-id>" \
     https://vymanager.example.com:8000/vyos/interfaces/ethernet/config
```

Rules:

- Tokens act as their owner and never exceed the owner's permissions.
- A read-only token (the default) is rejected on every write operation, even if the owner is an admin.
- Token clients have no persistent instance connection. Every request that touches a router must name the target with the `X-VyOS-Instance-Id` header; without it, endpoints that need a router answer as if you were disconnected.
- A token restricted to specific sites or instances is rejected on any other instance, regardless of the owner's grants.
- Expired or revoked tokens return `401 Invalid or expired API token`.

## Public endpoints

A handful of endpoints work without authentication: the API root `/`, the interactive docs at `/docs` and the spec at `/openapi.json`, `/session/onboarding-status`, and `/vyos/version/check`. Everything else requires a session or token.
