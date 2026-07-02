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

Same selector layout for BFD, MPLS, NHRP, RPKI and Traffic Engineering. Traffic Engineering only appears when the connected VyOS version reports support for it. BFD is the one section with live state: it reads peer status from the router in addition to configuration. Segment Routing appears in the menu but has no editor yet and shows a work-in-progress placeholder.

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
