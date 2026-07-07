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

## Failed migrations stop the container

A failed schema migration is fatal by design: the frontend container prints
the Prisma error, points at `npx prisma migrate status`, and exits nonzero
instead of starting. It never marks migrations as applied without running
them — a container that refuses to boot is recoverable; a database that
misrepresents its own schema is not. If a deploy fails, inspect the state
with `npx prisma migrate status`, resolve the failed migration (Prisma's
troubleshooting guide covers the cases), restore from your pre-upgrade
backup if needed, and restart.

## Verifying an upgrade

Two checks let you prove an upgrade changed nothing it should not have.
Both run against your live database and need `DATABASE_URL` (and a checkout
of the backend with its requirements installed, or a shell in the backend
container).

**Permission equivalence.** Before upgrading, snapshot the resolved
permissions of every (user, instance) pair into a local golden file:

```bash
GOLDEN_PERMISSIONS_MODE=capture DATABASE_URL=postgresql://... \
    pytest tests/test_permission_golden.py -v
```

After upgrading, compare — identical output proves zero permission changes:

```bash
GOLDEN_PERMISSIONS_ALLOW_VERSION_MISMATCH=1 DATABASE_URL=postgresql://... \
    pytest tests/test_permission_golden.py -v
```

The golden file records which app version captured it; the compare refuses a
version mismatch unless the override flag is set, so a stale or foreign file
cannot pass as evidence. Across an upgrade the mismatch is expected — the
flag is you confirming which two versions are being compared. Failures are
reported per user, per instance, per feature.

**Organization backfill.** Upgrades that introduce the
[organization groundwork](../architecture/organizations.md) backfill new
tables. Right after such a migration, assert the backfill invariants:

```bash
DATABASE_URL=postgresql://... python -m scripts.verify_org_migration
```

It exits nonzero and names the violated rule if anything is off (missing
default org, a site without an organization, memberships not matching users,
an org with members but no owner). Run it once right after the migration —
one of its rules is a migration-time invariant, not a recurring check.

## VyOS router updates

VyManager reports but does not install router updates. The Sites page shows a per-site rollup of `show system updates` across all reachable instances (see [Sites](../user-guide/sites#fleet-updates)). Install VyOS images through your normal router upgrade process.

After a router major-version upgrade (1.4 to 1.5), edit the instance in Site Manager and update its **VyOS version** field — it selects the command syntax VyManager uses, and capability-gated features stay hidden until it is correct.
