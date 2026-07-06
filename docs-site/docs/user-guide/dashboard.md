---
id: dashboard
title: Dashboard
sidebar_position: 1
---

# Dashboard

The dashboard is the landing page after connecting to an instance. It is a three-column grid of cards fed by a live stream: the backend queries the router's GraphQL API and pushes updates to the browser over server-sent events, so counters move without reloading.

If no VyOS instance exists yet (for example after skipping the instance step during onboarding), the dashboard instead shows a "Connect your first VyOS instance" panel linking to Site Manager.

Nine card types are available:

| Card | Shows |
|---|---|
| Interface Statistics | Per-interface packet/byte counters |
| System Info | Hostname, version, uptime, load |
| Network Speed | Rolling two-minute throughput chart for a selectable interface |
| WireGuard Peers | Peer handshake and transfer state |
| QoS Stats | Queue statistics |
| OpenVPN | Tunnel status |
| VRRP Status | High-availability group state |
| BGP Status | Neighbor summary |
| IPsec | Tunnel status |

The header shows the VyManager version and flags when a newer release is available.

## Editing the layout

With dashboard write permission, an Edit Dashboard toggle enables layout editing: drag cards between columns, resize width and height, remove cards, and add new ones from a catalog. Cards tied to a feature (WireGuard, QoS, OpenVPN, VRRP, BGP, IPsec) are locked in the catalog unless you can read that feature. Changes apply immediately on screen but persist only when you click Save Layout; Cancel restores the saved layout. Layouts are stored per user in the database.
