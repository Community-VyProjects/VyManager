---
id: requirements
title: Requirements
sidebar_position: 1
---

# Requirements

## Host

For the standard Docker deployment you need:

- Docker Engine with the Docker Compose plugin
- About 1 GB of free RAM for the three containers (PostgreSQL, backend, frontend)
- Open ports on the host: 3000 (frontend), 8000 (backend API), 5432 (PostgreSQL, only exposed by the default compose file)

The interactive installer (`install.sh`) supports Ubuntu, Debian, Fedora, CentOS/RHEL/Rocky/Alma, Arch and openSUSE, and installs Docker for you if it is missing.

For a manual (non-Docker) install you need:

- Python 3.11 or newer (the official backend image uses `python:3.11-slim`)
- Node.js 24 (the official frontend image uses `node:24-alpine`)
- PostgreSQL 16

## VyOS routers

VyManager manages VyOS 1.4 and 1.5 routers, including rolling releases. Each router needs:

- The VyOS HTTP API enabled and reachable from the VyManager host (default port 443)
- An API key configured on the router
- GraphQL enabled if you want the live dashboard cards (interface counters, system info, network speed graph, WireGuard peers)

See [Enabling the VyOS HTTP API](vyos-http-api) for the exact commands.

## Browser

Any current browser. The UI supports light and dark themes.
