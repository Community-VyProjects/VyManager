---
id: backups
title: Backups
sidebar_position: 1
---

# Backups

Three separate things are worth backing up, and they are not the same:

## VyManager application backup

Site Manager → Backup & Restore exports users, sites, instances (including VyOS API keys and SSH keys), permission grants and OAuth providers as one encrypted `.vymgr` file. The file is encrypted with your passphrase (scrypt key derivation, AES-256-GCM) and is self-contained: it can be restored on any VyManager host with the passphrase alone.

One exception: SSH private keys inside the backup are stored as the database holds them — encrypted with the source host's `SSH_ENCRYPTION_KEY`. Restoring onto a host with a different `SSH_ENCRYPTION_KEY` restores everything, but those SSH keys cannot be decrypted there; the restore preview warns when this is the case, and you would regenerate the per-instance SSH keys afterwards. When migrating a deployment, carry `SSH_ENCRYPTION_KEY` over in the new host's `.env`.

Restore supports **Merge** (upsert, nothing deleted) and **Replace** (wipe and restore exactly; signs everyone out). Restore is also available before onboarding, so a fresh install can be seeded from a backup.

### Who can back up, and organization scope

Backup and restore are platform-administrator operations: only a user with the platform **ADMIN** role can create or restore a `.vymgr` file. An organization admin (the `ADMIN` role *within* an organization) cannot — the backup is a whole-system disaster-recovery tool, not a per-organization export.

This still holds once [organization enforcement](../architecture/organizations) is enabled. The export runs with the system administrator's row-level-security bypass, so it captures every organization's sites, instances and grants in one file; there is no org-scoped partial export, and restore likewise rewrites the whole system.

## PostgreSQL

The `.vymgr` backup covers the same data, but a database-level backup protects against botched upgrades and gives point-in-time recovery. Either dump:

```bash
docker exec vymanager-postgres pg_dump -U vymanager vymanager > vymanager-$(date +%F).sql
```

or snapshot the `postgres_data` volume while the stack is stopped. `docker compose down` keeps the volume; only `down -v` deletes it.

## Router configurations

VyManager does not store router configs — each router is its own source of truth. Use VyOS's own config archive: System → Settings → Advanced manages commit-history size and remote archive locations, and the archive browser can diff and restore old versions (see [System](../user-guide/system)). For off-router copies, configure a remote archive location (TFTP/FTP/SFTP) there.
