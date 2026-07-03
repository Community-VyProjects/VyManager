---
id: network
title: Network
sidebar_position: 2
---

# Network

The Network menu covers interfaces, DHCP, NAT (including NAT64 and NAT66), VRFs and high availability. Pages read the router's configuration once on load; a Refresh button forces a re-read from the router. Every change is collected in a dialog and saved as one atomic batch (a single VyOS commit).

## Interfaces

One page for all interface types. A sidebar lists the types with counts — ethernet, WireGuard, VXLAN, tunnel, bonding, bridge, dummy, GENEVE, input, L2TPv3, loopback, MACsec, PPPoE, pseudo-ethernet, SSTP client, virtual-ethernet, VTI, wireless, WWAN, and VPP when the connected VyOS version supports it. Each type gets a searchable table with name, description, addresses, VRF, status and type-specific columns, plus create/edit/delete dialogs.

VLANs have their own view with sub-tabs for `vif`, `vif-s` and `vif-c`, switchable between ethernet and bonding parents. Bridge rows expand to manage bridge VIFs inline.

## DHCP

A sidebar lists shared networks; the main area has four tabs: Subnets, Ranges, Static Mappings, and Leases. Subnet rows show gateway, DNS servers, lease time and an active-lease count computed from the lease table. Leases can be released and converted to static mappings. DHCP can be disabled per shared network or globally — both toggles ask for confirmation, and a banner warns while DHCP is globally disabled. On VyOS 1.4 only active leases can be released; 1.5 clears any lease.

## NAT

A rule-type sidebar switches between Source, Destination, Static, and — on VyOS 1.5 — CGNAT. Rule tables show protocol, source, destination, translation, interfaces and status. Rules can be reordered by drag and drop; reordering shows a save/cancel banner and applies as a single commit. Create, edit and delete dialogs per rule type. Firewall group references resolve to their members in tooltips.

**NAT64** manages source rules with their translation pools: select a rule in the sidebar, edit its pools, prefix and match settings on the right, or disable the rule without deleting it. **NAT66** manages source and destination rules for IPv6 prefix translation, including masquerade and exclude/log flags.

## VRF

A sidebar lists VRF instances with their routing table IDs. The selected VRF has tabs for Settings, Static Routes, and per-VRF routing protocols (OSPF, OSPFv3, IS-IS, BGP). On VyOS 1.5, additional RPKI, Failover, DHCP and DHCPv6 tabs appear. A global "bind to all VRFs" toggle and create/delete dialogs round it out.

## High availability

Manages VRRP on the connected router: a global settings panel (VRRP version, startup delay, SNMP), tabs for VRRP groups, sync groups and virtual servers. Groups can be enabled/disabled individually, and an "HA Enabled" checkbox toggles the whole subsystem. Live VRRP state is on the dashboard's VRRP card and in Monitoring, not here — this page edits configuration.

## Routes

The `/network/routes` entry is a placeholder. Static route management lives under [Routing](routing).
