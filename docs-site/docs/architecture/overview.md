---
id: overview
title: Overview
sidebar_position: 1
---

# Architecture overview

VyManager consists of three services plus the routers it manages:

```
Browser ── Next.js frontend ── FastAPI backend ── VyOS HTTP API (per router)
                 │                    │
                 └──── PostgreSQL ────┘
```

## Frontend

Next.js (App Router, TypeScript) serves the UI and owns authentication. It uses Better Auth for login and session issuance, Prisma as the ORM, and Zustand for client state. The browser never calls the backend directly for HTTP: server-side proxy routes under `/api/vyos`, `/api/session` and `/api/dashboard` forward requests to the backend at `BACKEND_URL`, passing the session cookie along. `BACKEND_URL` is read at request time, so it can be changed without rebuilding the image.

WebSockets are the exception. The terminal console and live monitoring connect from the browser straight to the backend: in development (frontend on port 3000) to `<host>:8000`, in production to the same origin, which means a reverse proxy must upgrade WebSocket connections on `/vyos/monitoring/ws/*` and `/vyos/console/ws/*` and forward them to the backend. `NEXT_PUBLIC_WS_URL` overrides this at build time.

## Backend

FastAPI application (`backend/app.py`), Python 3.11, run under uvicorn. It talks to PostgreSQL through asyncpg (no ORM) and to VyOS routers through a vendored pyvyos client. Around 100 routers under `backend/routers/` cover the VyOS feature surface; most expose the same three endpoints per feature:

- `GET /vyos/<feature>/capabilities` — which parts of the feature the connected VyOS version supports
- `GET /vyos/<feature>/config` — normalized configuration read from the router
- `POST /vyos/<feature>/batch` — atomic set/delete operations

Behind the routers sit two version-aware layers:

```
Routers (HTTP endpoints, RBAC checks)
    → Builders (vyos_builders/ — collect operations into one batch)
    → Mappers (vyos_mappers/ — VyOS 1.4 vs 1.5 command syntax)
    → pyvyos (HTTP calls to the router)
```

The frontend reads each feature's `/capabilities` response and hides UI for anything the connected version does not support.

## Database

PostgreSQL 16. The schema is defined once, in `frontend/prisma/schema.prisma`; the frontend container applies migrations on startup. The backend queries the same tables directly with SQL. The main tables:

| Table | Holds |
|---|---|
| `users`, `sessions`, `accounts` | Better Auth users and login sessions |
| `sites`, `instances` | Sites and the VyOS routers inside them, including API keys |
| `active_sessions` | Which instance each user is currently connected to |
| `user_instance_roles`, `user_feature_permissions` | RBAC grants |
| `api_tokens` | Personal access tokens (hashed) |
| `audit_logs` | Config-mutating API calls |
| `dashboard_layouts`, `firewall_separators`, `scheduled_power_actions` | UI and scheduling state |
| `oauth_providers`, `oauth_role_mappings` | External OAuth login configuration |

No VyOS configuration is stored in the database. VyManager reads the running configuration from the router on demand and caches it in memory per instance; the router remains the source of truth.

## Startup

On startup the backend creates an asyncpg pool (5–20 connections), starts a background task that deletes inactive sessions, and starts a poller that feeds server-sent-event banners (config diffs, commit-confirm timers) to connected clients. If the database is unreachable the API still starts, but every authenticated request fails with 503.
