---
id: multi-site
title: Multi-site model
sidebar_position: 5
---

# Multi-site model

## Sites and instances

A site is a logical group of routers — a location, a customer, a role. An instance is one VyOS router inside a site. Instances store everything the backend needs to reach the router:

- `host`, `port`, `protocol`, `verifySsl`, `timeout`
- `apiKey` — the VyOS API key
- `vyosVersion` — `1.4` or `1.5`, selects the command mappers
- `commitConfirmEnabled`, `commitConfirmMinutes` — per-instance commit-confirm settings
- `isActive` — inactive instances refuse connections

Sites and instances are managed in Site Manager by global admins. Access for other users is granted per instance or per site — see [RBAC and permissions](rbac). An organization layer above sites is being built incrementally and is inert today — see [Organization groundwork](organizations).

## One active instance at a time

A browser session manages one router at a time. Connecting to an instance from the Sites page creates the user's `active_sessions` row; every feature page then reads and writes that router. Switching routers means disconnecting and connecting to another instance. API token clients are not bound to this model — they name the instance per request with the `X-VyOS-Instance-Id` header.

There is no fleet-wide configuration push. Each instance is configured individually against its own running config.

## Fleet update visibility

The one fleet-level read is `GET /vyos/sites/{site_id}/updates`: it fans out `show system updates` across all instances in a site the caller can see and returns a per-instance rollup. It is strictly read-only, bounded to 8 concurrent router calls, and caches per-instance results for 60 seconds (`?refresh=true` forces a re-poll). It never applies an update.

## Config-sync

The Config-Sync page (`/vyos/config-sync` endpoints) configures VyOS's own `service config-sync` feature on the connected router: a primary router pushes selected configuration sections (firewall, NAT, interfaces, protocols and so on) to a secondary router using the secondary's API address and key. The synchronization itself is done by VyOS between the two routers — VyManager only writes the config-sync configuration to the primary. The section template is identical on VyOS 1.4 and 1.5.

## Failover routing

The Failover page (`/vyos/failover` endpoints) manages VyOS failover routes (`protocols failover`): static routes with health-checked next-hops that VyOS withdraws when the check fails. Version differences are handled by the mappers — VyOS 1.4 supports next-hop targets with a flat check-target list; 1.5 adds DHCP-interface next-hops and per-target interface/VRF.

Both features are router-level VyOS functionality that VyManager configures. VyManager itself does not implement config replication or failover between sites.

## High availability

VRRP and virtual-server configuration on the connected router is managed through the high-availability endpoints (`/vyos/high-availability`), with VRRP status readable from the monitoring side. Same model as above: VyManager configures the router's own HA features.
