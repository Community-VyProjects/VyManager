---
id: errors
title: Errors
sidebar_position: 2
---

# Errors

## HTTP errors

Errors raised by the API use FastAPI's standard envelope:

```json
{ "detail": "Insufficient permissions. Write access to Firewall required." }
```

`detail` is usually a string. A few endpoints return a structured detail, for example when no instance is connected:

```json
{
  "detail": {
    "error": "No active instance",
    "message": "You must connect to a VyOS instance first. Use POST /session/connect."
  }
}
```

Common status codes:

| Status | Meaning |
|---|---|
| 400 | No active instance, inactive instance, or invalid input |
| 401 | Missing/invalid session cookie or API token |
| 403 | Authenticated but not permitted: RBAC denial, read-only token on a write, sign-up after onboarding |
| 404 | Resource not found; also used for "no active instance" on permission lookups |
| 409 | A commit-confirm is already active (or confirming with none active) |
| 429 | Login rate limit (10 attempts per minute per IP, enforced by the frontend) |
| 503 | Database unavailable, or the router could not be reached |
| 504 | The router did not answer within the instance's timeout |

## Router errors inside 200 responses

Feature `/batch` endpoints and similar write operations return HTTP 200 with a success flag when the request itself was well-formed but VyOS rejected the commit:

```json
{ "success": false, "error": "Configuration path: [interfaces ethernet eth9] is not valid" }
```

Always check `success`, not just the HTTP status. On success, `data` (when present) carries any output from the router.
