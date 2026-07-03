---
id: firewall
title: Firewall
sidebar_position: 3
---

# Firewall

Six pages: Policies (IPv4/IPv6 rules), Bridge, Groups, Zones, Global Options and Flowtables.

## Policies

The main rule editor. A sidebar switches between IPv4 and IPv6, each with the base chains — Forward, Input, Output, and on VyOS 1.5 Prerouting (raw) — plus your custom chains, which you can create and delete here.

The rule table shows rule number, action and a configurable set of columns: protocol, source and destination with ports, state, description and status are visible by default; log, interface, limit, time, ICMP type, TCP flags, connection status, mark, packet length and recent-match columns can be toggled on. Column layout is remembered per browser.

Rules are added, cloned, edited and deleted through dialogs. Each chain has a default action (accept/drop/reject); custom chains also take a description, default logging, and a default jump target. Match fields that depend on the VyOS version (remote groups, dynamic address groups, IPsec match, GRE match) only appear when the router supports them.

Rules reorder by drag and drop. Changes stage locally with a save/cancel banner; saving renumbers the dragged rules within the existing number set and applies as one commit. You can also insert colored **separators** between rules to label sections — separators are VyManager UI metadata stored in its database, never sent to the router, and they follow their rules when rules are renumbered or deleted.

## Bridge

Layer-2 firewall rules. On VyOS 1.4 only the Forward chain exists (the page says so in a banner) and protocol matching is unavailable; VyOS 1.5 adds Input, Output and Prerouting chains and custom chains. Same table/dialog/reorder pattern as Policies; saving a reorder renumbers rules from 100 upward.

## Groups

A card grid of all firewall groups — address, IPv6 address, network, IPv6 network, port, interface, MAC, domain and remote groups — with member previews and search. Which group types are offered depends on what the connected VyOS version supports. Create, edit and delete via dialogs.

## Zones

Zone-based firewall management. The page combines:

- A **zone table** — zones with their member interfaces and VRFs, plus create/edit dialogs.
- A **policy matrix** — a source × destination grid where each cell is colored by that zone pair's default action and shows its rule count. Clicking a cell filters the rule table to that pair.
- A **rule table** for the selected pair (or all pairs grouped by zone pair), with an IPv4/IPv6 toggle. Rules are edited in a side panel supporting address, group, GeoIP country, MAC and port matching. Under the hood each zone pair is a custom chain in the IPv4/IPv6 firewall; VyManager resolves the mapping for you.

Reordering works when a single zone pair is selected and renumbers rules as 10, 20, 30… Separators are available in the focused view.

## Global options

A settings form, not a rule table: ICMP behavior (all-ping, broadcast-ping), source routing, ICMP redirects, security options (log-martians, source validation, SYN cookies, TWA hazards protection) and state policies for established/invalid/related traffic. On VyOS 1.5 two more cards appear: bridged traffic handling and connection timeouts (per TCP state, UDP, ICMP). Changes are tracked and saved with an explicit Save button.

## Flowtables

Flow offload tables: name, member interfaces and offload type (software or hardware). Hardware offload is only offered when the router supports it.
