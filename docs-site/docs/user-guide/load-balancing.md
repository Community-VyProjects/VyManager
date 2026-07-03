---
id: load-balancing
title: Load balancing
sidebar_position: 8
---

# Load balancing

Two pages: HAProxy (reverse proxy) and WAN load balancing.

## HAProxy

Manages the router's HAProxy-based `load-balancing reverse-proxy`. Tabs for Backends and Services, with counters for backends, services and total servers.

- **Backends** — name, mode, balance algorithm, servers, health checks, SSL, and rules. Clicking a backend opens its detail page where servers and rules are edited.
- **Services** — name, mode, listen port, attached backends, SSL (with redirect badge), rules. Each service links to its own detail page.

A Quick Setup dialog creates a backend and a service together. The page warns when the configuration is incomplete — VyOS requires at least one backend and one service to exist together — and the delete confirmation warns when you are removing the last of either.

## WAN

Manages `load-balancing wan`: outbound traffic distribution across multiple uplinks.

- **Global settings** — disable source NAT, handle local traffic, flush connections on failover, sticky connections; edited in one dialog.
- **Interface health** — per-uplink next-hop, failure/success thresholds (default 5/5) and health test badges, with add/edit/delete dialogs.
- **Rules** — the load-balancing rules table with its own search and dialogs.

Both pages require load-balancing write permission for any change; deletes confirm first.
