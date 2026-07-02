---
id: index
title: VyManager documentation
slug: /
---

# VyManager documentation

VyManager is a centralized management platform for multi-site VyOS routers. It runs a FastAPI backend and a Next.js frontend, stores state in PostgreSQL, and talks to routers over the VyOS HTTP API.

- [Getting Started](getting-started/requirements) — requirements, installation, environment reference, first run
- [Architecture](architecture/overview) — how the pieces fit together: VyOS communication, sessions, RBAC, multi-site model
- [User Guide](user-guide/dashboard) — one page per dashboard area
- [Reference](reference/authentication) — auth, errors, API conventions, commit-confirm, and the [generated API reference](/api/)
- [Operations](operations/backups) — backups, upgrades, reverse proxy, troubleshooting
- [Contributing](contributing/dev-setup) — dev setup, tests, regenerating the API reference
