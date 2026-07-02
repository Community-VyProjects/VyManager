---
id: environment-variables
title: Environment variables
sidebar_position: 4
---

# Environment variables

In the Docker Compose deployment, both the backend and frontend containers read the same `.env` file; each service only picks up the variables it knows. Defaults below are the values the code falls back to when a variable is unset.

## Shared

| Variable | Required | Default | Used for |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | yes | none | Signs session cookies in the frontend (Better Auth) and verifies them in the backend (`session_cookie.py`). Must be identical in both services. If unset, the backend cannot verify any session cookie and all authenticated requests fail. |
| `DATABASE_URL` | yes | none | PostgreSQL connection string. The backend refuses to serve authenticated requests without it; the frontend uses it through Prisma. Format: `postgresql://user:password@host:5432/dbname`. |
| `TRUSTED_ORIGINS` | yes | none | Comma-separated list of URLs users access VyManager from. The frontend passes it to Better Auth as trusted origins; the backend uses it to validate the `Origin` header on WebSocket connections (console and monitoring). The backend falls back to `FRONTEND_URL` when it is unset. |

## Backend

| Variable | Required | Default | Used for |
|---|---|---|---|
| `FRONTEND_URL` | yes | `http://localhost:3000` | CORS allowed origin. Exactly one URL. |
| `FRONTEND_INTERNAL_URL` | no | `http://frontend:3000` | URL the backend uses to call the frontend's internal API (user creation via Better Auth). Only change it when backend and frontend run outside Docker on separate hosts. |
| `SSH_ENCRYPTION_KEY` | yes | none | AES-256-GCM key that encrypts stored SSH private keys and configuration backups at rest. Must be exactly 64 hex characters (32 bytes). Operations that touch SSH keys or encrypted backups fail if it is missing or the wrong length. |
| `SESSION_INACTIVITY_TIMEOUT` | no | `30` | Minutes of inactivity before a session is removed. Applies to both VyOS instance sessions and authentication sessions; hitting it logs the user out. |
| `SESSION_CLEANUP_INTERVAL` | no | `5` | Minutes between runs of the background session cleanup task. |
| `VYMANAGER_VERSION` | no | `dev` | Version string reported by the API and used by the update checker. Baked into the official images at build time; do not set it yourself. |
| `VYMANAGER_ENV` | no | `dev` | Environment string reported by the version endpoint. The official images set it to `production`. |
| `GITHUB_BUG_REPORT_CLIENT_ID` | no | `Ov23lignyrCHrXxi5tg7` | GitHub OAuth app (device flow) used by the in-app bug reporter. The default is the public VyManager OAuth app; only forks need to change it. |
| `GITHUB_BUG_REPORT_REPO` | no | `Community-VyProjects/VyManager` | Repository (`owner/repo`) that in-app bug reports are filed against. |
| `GITHUB_BUG_REPORT_SCOPE` | no | `public_repo` | OAuth scope requested for bug reports. Use `repo` only if the target repository is private. |

## Frontend

| Variable | Required | Default | Used for |
|---|---|---|---|
| `BETTER_AUTH_URL` | yes | none | Base URL where users reach the application in their browser. |
| `NEXT_PUBLIC_APP_URL` | yes | none | Same URL, exposed to browser-side code. |
| `BACKEND_URL` | yes | `http://backend:8000` | URL of the backend API. Read at runtime by the server-side proxy routes (`/api/vyos`, `/api/session`, `/api/dashboard`), so it can be changed without rebuilding the image. Inside Docker Compose keep the default. |
| `NODE_ENV` | no | none | Standard Node environment. Set `production` for deployments. |
| `VYMANAGER_ENV` | no | production behavior | When set to `development`, the container entrypoint starts `next dev` instead of the production build. |
| `BETTER_AUTH_SECURE_COOKIES` | no | `false` | Set `true` to mark session cookies `Secure`. Only takes effect in production mode and requires HTTPS end to end. |
| `NEXT_PUBLIC_WS_URL` | no | none | Explicit override for the WebSocket endpoint (e.g. `wss://api.example.com`). When unset, the client derives the WebSocket URL itself. `NEXT_PUBLIC_` variables are baked in at build time, so this only applies when building the frontend yourself. |
| `ALLOWED_DEV_ORIGINS` | no | none | Comma-separated hostnames allowed to reach the Next.js dev server. Development only. |
| `ALLOW_ONBOARDING_FAIL_OPEN` | no | `false` | When `true`, sign-up is allowed even if the frontend cannot reach the backend to check whether onboarding is complete. Leave it off: fail-open means anyone can register while the backend is down. |

## Legacy

`backend/config_loader.py` still contains a loader for `VYOS_NAME`, `VYOS_HOSTNAME`, `VYOS_APIKEY`, `VYOS_VERSION` and related `VYOS_*` variables from the old single-instance architecture. It is not imported anywhere; VyOS instances are managed in the database through the web UI. Do not set these variables.
