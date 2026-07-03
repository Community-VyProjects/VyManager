---
id: upgrades
title: Upgrades
sidebar_position: 2
---

# Upgrades

## Upgrading VyManager

Docker deployments upgrade by pulling newer images:

```bash
cd vymanager
docker compose pull
docker compose up -d
```

Database state survives in the `postgres_data` volume. Schema migrations run automatically: the frontend container applies pending Prisma migrations on startup before Next.js starts. Take a database backup first (see [Backups](backups)) — migrations are forward-only.

The dashboard header checks for new releases (`/vyos/version/check` compares the running `VYMANAGER_VERSION` against the latest published release) and shows a link when an update is available.

Manual installs upgrade with `git pull`, then reinstall dependencies (`pip install -r requirements.txt`, `npm install`), run `npx prisma migrate deploy`, rebuild the frontend and restart both services.

## VyOS router updates

VyManager reports but does not install router updates. The Sites page shows a per-site rollup of `show system updates` across all reachable instances (see [Sites](../user-guide/sites#fleet-updates)). Install VyOS images through your normal router upgrade process.

After a router major-version upgrade (1.4 to 1.5), edit the instance in Site Manager and update its **VyOS version** field — it selects the command syntax VyManager uses, and capability-gated features stay hidden until it is correct.
