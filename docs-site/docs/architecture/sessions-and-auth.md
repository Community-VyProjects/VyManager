---
id: sessions-and-auth
title: Sessions and authentication
sidebar_position: 3
---

# Sessions and authentication

## Login sessions

The frontend owns login. Better Auth authenticates users against the `users` table and stores sessions in the `sessions` table. The browser gets a signed cookie, `better-auth.session_token` (or `__Secure-better-auth.session_token` with secure cookies enabled), in the format:

```
{session_id}.{base64(HMAC-SHA256(BETTER_AUTH_SECRET, session_id))}
```

The backend does not call the frontend to validate requests. It verifies the cookie signature itself with the shared `BETTER_AUTH_SECRET` (`session_cookie.py`), then loads the session row from PostgreSQL and checks expiry. This is why the secret must be identical in both services.

## Backend middleware chain

Requests pass through three middlewares, in this order:

1. **AuthenticationMiddleware** — verifies the cookie signature or API token, loads the session, attaches `request.state.user`. Rejects with 401 otherwise. A small set of paths is public (`/`, `/docs`, `/openapi.json`, `/session/onboarding-status`, sign-in/sign-up, the monitoring WebSocket which authenticates inside the handler, and `/vyos/version/check`). `/session/restore` authenticates only if a session is present — the handler decides, so a backup can be restored on a system that has no users yet.
2. **SessionMiddleware** — resolves which VyOS instance the user is connected to and attaches `request.state.instance` and `request.state.site`, including the instance's API key (wrapped so it never appears in logs or serialized output).
3. **AuditMiddleware** — records config-mutating calls (POST/PUT/PATCH/DELETE under `/vyos/*`) to the `audit_logs` table: user, action, path, status code, auth method, token ID and target instance. Audit failures never break the request being recorded.

CORS is handled before all of these and allows exactly one origin: `FRONTEND_URL`.

## Inactivity timeout

Every authenticated request updates the session's `lastActivityAt` — except a set of background polling endpoints (`/vyos/config/diff`, `/session/current`, the SSE banner stream and others), so an idle browser tab does not keep a session alive. A background task runs every `SESSION_CLEANUP_INTERVAL` minutes and deletes sessions idle longer than `SESSION_INACTIVITY_TIMEOUT` minutes (default 30). This removes both the instance connection and the login session — the user is logged out.

## Instance sessions

Being logged in and being connected to a router are separate things. The `active_sessions` table holds one row per user: the instance they are currently managing, set by `POST /session/connect` from the Sites page. `SessionMiddleware` reads it on every request; handlers that touch a router return 400 ("No active instance") when it is missing.

The row also stores the login session token it was created under. If the same user logs in from another device, the stored token no longer matches and the instance connection is cleared — the user must reconnect to an instance on the new device.

## API tokens

Non-browser clients authenticate with a personal access token in the `Authorization: Bearer vym_...` header. The middleware hashes the presented token and looks it up in `api_tokens`; revoked or expired tokens are rejected, and `lastUsedAt` is updated on use. A valid token attaches the owner's identity to the request exactly like a cookie session, so RBAC and audit behave identically.

Token clients have no `active_sessions` row. They select the target router per request with the `X-VyOS-Instance-Id` header; the middleware validates that the token's owner has a grant on that instance, and additionally that the token's own scope allows it. Tokens carry:

- **scopes** — a token whose scopes include `read` is read-only: write operations are rejected even if the owner is an admin
- **allowedInstanceIds / allowedSiteIds** — optional restriction to specific instances or sites; empty means any instance the owner can reach

Tokens are managed in the settings UI and under `/tokens` in the API.
