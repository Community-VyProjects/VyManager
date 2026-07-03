---
id: sites
title: Sites
sidebar_position: 10
---

# Sites

Site Manager is the entry hub: whenever you are not connected to an instance, VyManager sends you here. It has its own left rail with four sections — Sites, User Management, Authentication and API Tokens (the last three are covered in [Settings and administration](settings)).

## Sites and instances

The site list shows every site you can see, with your role per site. Selecting a site lists its instances as cards or a table: name, host and port, active/inactive, whether you are connected, and a reachability dot.

Site admins can create, edit and delete sites (deleting warns that it removes the site's instances) and manage instances: create, edit, move to another site, delete. Instance settings cover connection details (host, port, protocol, API key, verify SSL, timeout), the VyOS version, SSH username and port for monitoring/console, and per-instance commit-confirm (enabled flag plus timer minutes).

**Connect** on an instance card makes it your active instance and takes you to the dashboard. Disconnect (in the sidebar of any page) brings you back here. Inactive instances refuse connections.

## Fleet updates

A rollup panel above the instance list summarizes `show system updates` across the site: how many routers have updates available, which are unreachable. A detail dialog lists per-instance status — up to date, update available with version, not configured, inactive, unreachable — with a re-check button. This is informational only; nothing here installs updates. The reachability dot on each instance card comes from the same poll.

## Backup and restore

The Backup & Restore dialog exports and imports VyManager's own state: users, sites, instances including API keys and SSH keys, permission grants and OAuth providers — not router configuration.

- **Backup** — choose a passphrase (minimum 8 characters); VyManager downloads an encrypted `.vymgr` file. The file contains secrets and the passphrase is not recoverable.
- **Restore** — upload the file with its passphrase and review the preview (record counts, creation date, warnings) before applying. Two modes: **Merge** upserts records and deletes nothing; **Replace** wipes existing data, restores the backup exactly, and signs you out.
