---
id: system
title: System
sidebar_position: 11
---

# System

## System settings

Configures the router's `system` tree in tabs: General (hostname and basics), Users & Login (the router's own system accounts and SSH keys — not VyManager users), Syslog, Conntrack, Host Mapping, IP Settings, Scheduler (cron tasks), Flow Accounting, and Advanced. Without system write permission the page is read-only and says so.

The Advanced tab holds watchdog settings and **config management**: commit history size and archive locations. From there, "Browse backups" opens the archive viewer:

- Lists the router's archived config versions.
- Shows a diff of any archive against the running configuration — added, removed and modified paths, plus the equivalent `set`/`delete` commands.
- Restores an archive to the running configuration after an explicit confirmation that it replaces the running config immediately.

## Containers

Manages the router's container support (Podman on VyOS): containers, networks, registries, images and an app catalog with a setup wizard. Configuration changes batch through the API as usual; image pulls, container restarts, file browsing and logs run over the instance's SSH connection. On first use the page asks for a base directory for container volumes.

## Power actions

Scheduled reboot and poweroff live on the [Settings](settings) page: run now, at a specific time, or in N minutes. While an action is scheduled, a banner on every page shows a live countdown, who scheduled it, and a Cancel button.

The Logs, Services and Users entries under System are placeholders in this release.
