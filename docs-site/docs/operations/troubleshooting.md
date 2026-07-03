---
id: troubleshooting
title: Troubleshooting
sidebar_position: 4
---

# Troubleshooting

Start with the container logs — most failures announce themselves there:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

## Every request returns 401

The backend verifies session cookies with `BETTER_AUTH_SECRET`. If the value differs between the backend and frontend environment, every authenticated request fails. The backend logs `BETTER_AUTH_SECRET is not set — cannot verify session cookies` when the variable is missing entirely. Set the same value for both services and restart.

## Backend starts but authentication fails with 503

`DATABASE_URL` is missing or PostgreSQL is unreachable. The API deliberately starts anyway and answers 503 on authenticated routes. Check `docker compose ps postgres` and that the hostname in `DATABASE_URL` is `postgres` (the compose service name), not `localhost`.

## Cannot connect to a VyOS instance

1. Verify the API key on the router matches the instance settings.
2. Verify the router's HTTPS port (default 443) is reachable from the VyManager host: `curl -k https://<router>:443` from the host or backend container.
3. Self-signed certificate: either disable "Verify SSL" on the instance or add your CA to the backend trust store (see [Custom CA certificates](../getting-started/install-docker#custom-ca-certificates)).
4. Check the router actually has the API enabled — see [Enabling the VyOS HTTP API](../getting-started/vyos-http-api).

## Dashboard cards stay empty

The dashboard streams data from the router's GraphQL API. Confirm the router has `service https api graphql` enabled with key authentication (see [Enabling the VyOS HTTP API](../getting-started/vyos-http-api)). REST-only routers work everywhere else but leave the dashboard cards blank.

## Monitoring or console will not connect

- These pages need per-instance SSH set up first (Site Manager → edit instance → SSH); the page says so if the key is missing. Verify the public key is committed on the router and the SSH port is reachable.
- Behind a reverse proxy: the WebSocket paths `/vyos/monitoring/ws/...` and `/vyos/console/ws/...` must be upgraded and forwarded to the backend (port 8000). See [Reverse proxy and HTTPS](reverse-proxy). A proxy that only forwards to the frontend breaks exactly these two pages.
- The backend checks the WebSocket `Origin` header against `TRUSTED_ORIGINS` — the browser URL must be listed there.

## Login rejected with "Registration is closed"

Sign-up is only open while no users exist. After onboarding, admins create accounts in User Management. If the frontend cannot reach the backend to check onboarding status, sign-up fails closed with 503 by design (`ALLOW_ONBOARDING_FAIL_OPEN` overrides this; leave it off).

## Writes rejected with 409

A commit-confirm is pending on the instance. Confirm it or wait for the timer to expire (see [Commit and confirm](../reference/commit-confirm)).

## Frontend cannot reach backend

Inside Docker Compose `BACKEND_URL` must stay `http://backend:8000` (service name, not localhost). It is read at runtime, so fixing it needs only a container restart, not a rebuild.

## Reporting bugs

The sidebar's Report-a-Bug dialog files an issue on the VyManager GitHub repository via GitHub device-flow login. Include the backend log lines around the failure; failed batch requests are recorded by the frontend for exactly this purpose.
