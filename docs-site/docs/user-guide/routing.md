---
id: routing
title: Routing
sidebar_position: 4
---

# Routing

The Routing menu has four areas: unicast protocols, routing infrastructure, multicast, and static routes with failover. All pages follow the same pattern: the current configuration is read from the router (a refresh button forces a re-read), changes are collected in dialogs and saved as one atomic batch, and sections you lack read permission for are hidden entirely.

## Unicast protocols

A protocol selector on the left lists BGP, OSPF, OSPFv3, IS-IS, OpenFabric, RIP, RIPng and Babel — only the ones your role can read. These pages edit configuration; they do not show live protocol state (no session or adjacency status here).

- **BGP** — tabs for Overview (system AS, router ID, keepalive/holdtime timers), Neighbors, Peer Groups, Address Families and Parameters. Neighbors and peer groups have create/edit/delete dialogs.
- **OSPF / OSPFv3** — Overview (adjacency logging toggles), Areas, Interfaces, Redistribute, Advanced.
- **IS-IS** — Overview, Interfaces, Redistribute, Advanced.
- **RIP / RIPng** — Overview, Networks (networks, neighbors, static routes, passive interfaces), Interfaces, Redistribute, Filters.

## Infrastructure

Same selector layout for BFD, MPLS, NHRP, RPKI, Segment Routing and Traffic Engineering. Traffic Engineering only appears when the connected VyOS version reports support for it. BFD is the one section with live state: it reads peer status from the router in addition to configuration.

### Segment Routing (SRv6)

Two tabs: **Locators** (the IPv6 prefixes the router advertises for SRv6 segments — name, prefix, block/node lengths, function bits, uSID behavior) and **Interfaces** (which interfaces accept SR-enabled IPv6 packets, with the ingress HMAC policy). VyOS enforces a few rules the UI handles for you:

- A locator cannot be committed unless at least one interface has SRv6 enabled. When none does, the locator dialog asks for an interface and applies both changes in a single commit. For the same reason, the last SRv6 interface cannot be disabled while locators exist — delete the locators first.
- The locator prefix length must equal block length + node length (defaults 40 + 24, so a /64 prefix). The dialog validates this before sending anything, because the router itself reports only a generic commit failure.
- On VyOS 1.4, existing Segment Routing configuration cannot be modified in place (a platform limitation in the FRR integration). Every change on a 1.4 router removes and recreates the whole segment-routing tree in two commits; the page shows a banner and the dialogs say so explicitly. If the second commit fails, the tree is left empty — refresh and re-apply.
- Removing the entire configuration is always safe: deleting the last interface (with no locators left) clears the whole tree in one commit.

## Multicast

IGMP Proxy, PIM and PIM6, each a configuration editor with the standard dialog/batch pattern.

## Static routes

Five tabs with summary counters at the top:

- **Static Routes** — IPv4/IPv6 toggle, search, and a table of destinations with next-hops, interfaces, distance and blackhole/disabled badges. Create, edit, delete.
- **Static ARP** — interface/IP/MAC entries.
- **Multicast Routes** — prefix and next-hop entries (create and delete only).
- **Neighbor Proxy** — proxy-ARP (IPv4) and proxy-ND (IPv6) entries.
- **Routing Tables** — additional routing tables and their routes.

## Failover

A single table of health-checked failover routes (`protocols failover` on the router): destination, next-hops, check type and targets, metrics. Create, edit and delete; deleting asks for confirmation. On VyOS 1.5 the editor additionally offers DHCP-interface next-hops and per-target interface/VRF options; on 1.4 those fields are hidden because the router does not support them.
