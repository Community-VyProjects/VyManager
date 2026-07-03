---
id: services
title: Services
sidebar_position: 7
---

# Services

The Service menu collects the router's service daemons. Each page follows the standard pattern: configuration read from the router with a Refresh button, edit dialogs, one atomic batch per save, and all mutating controls hidden without write permission on that service's feature group.

- **Broadcast Relay** — UDP broadcast relay instances: port, member interfaces, source address. Instances and the whole service can be disabled.
- **Config Sync** — the router's primary/secondary configuration synchronization: secondary address, port, API key and timeout, plus which config sections to sync (see [Multi-site model](../architecture/multi-site#config-sync)).
- **Conntrack Sync** — connection-table synchronization between routers: sync interfaces, accepted protocols, VRRP sync-group failover, multicast group and queue sizes. The whole config can be removed in one action.
- **Console Server** — serial console server devices: device, alias, speed and serial parameters (e.g. 8N1), per-device SSH port. This configures out-of-band serial access on the router; it is unrelated to VyManager's own SSH console.
- **DHCP** — links to the DHCP page described under [Network](network#dhcp). DHCP Relay and DHCPv6 Relay have their own pages.
- **DHCPv6 Server** — shared networks with subnets, address ranges, prefix delegation and static mappings. The tables adapt to the VyOS version: subnet IDs and range IDs appear on 1.5, temporary-range and start/stop prefix-delegation fields on 1.4, MAC-based static mappings only where supported.
- **DNS Forwarding** — the PowerDNS recursor: name servers, per-domain forwarders, resolver settings (DNSSEC, ports), authoritative local zones with records, and advanced options. A Zone Cache tab and EDNS client-subnet options appear on VyOS 1.5.
- **DNS Dynamic** — ddclient services: provider protocol, server, hostnames, IP version, plus global check interval and VRF.
- **Event Handler** — journal-triggered scripts: filter pattern, syslog ID, script path and environment variables.
- **HTTPS** — the router's own management interface and HTTP API: port, listen addresses, allowed clients, TLS versions, certificates, API keys, REST and GraphQL toggles. Careful here: this edits the same API VyManager uses to reach the router.
- **IPoE Server** — the IPoE access concentrator: interfaces, local MAC-based authentication or RADIUS, IPv4/IPv6 pools, advanced options. The whole server can be deleted in one action.
- **PPPoE Server** — same layout for PPPoE: interfaces (with VLAN monitoring where supported), local users or RADIUS, pools, PPP options, advanced settings.
- **LLDP, NDP Proxy, NTP, Router Advert, Salt Minion, SLA, SNMP, SSH, TFTP Server** — one page each for the corresponding VyOS service, same table/dialog pattern.
- **Web Proxy** — Squid and squidGuard: proxy and cache settings, authentication (including LDAP), cache peers, listen addresses, and URL filtering with source groups, time periods and filter rules.
- **Monitoring** (service) — the router's monitoring service configuration; distinct from the live [Monitoring](monitoring) page.
