---
id: vpn
title: VPN
sidebar_position: 6
---

# VPN

Four pages: IPsec, L2TP, OpenVPN and WireGuard.

## IPsec

Tabs for Site-to-Site, Remote Access, IKE Groups, ESP Groups, Authentication (pre-shared keys), Pools and Settings, with summary counters at the top.

Site-to-site peers show live tunnel state next to their configuration: a per-peer badge counts how many of the peer's tunnels are up, and a Refresh Status button re-reads state from the router. With write permission you can add, edit and delete peers, bounce a single peer's tunnels, reset all peers, and reset remote-access sessions. Pre-shared keys are displayed masked. Deletes go through a confirmation dialog that warns about dependencies, for example a peer's tunnel count or a group still in use.

Version-dependent fields (address-pool ranges, IKE retransmission options, always-send-cert for remote access) only appear when the connected VyOS version supports them.

## L2TP

Configures the router's L2TP/IPsec remote-access server. Tabs: Overview (general, IPsec, PPP options and advanced settings, each with its own edit dialog), Local Users, RADIUS (global settings plus a server list), IP Pools, IPv6 Pools and Authentication. The header shows whether L2TP is configured at all, and a Delete L2TP button removes the entire configuration after confirmation. This page is configuration only — it does not list active sessions.

## OpenVPN

A table of OpenVPN interfaces with mode (server, client, site-to-site), local and remote endpoints, cipher summary and VRF. The Status column reflects the `disabled` flag in configuration, not live tunnel state. Clicking a row opens a read-only details drawer.

Two ways to create an interface: a quick-setup wizard or the full create dialog. Server-mode interfaces additionally offer client config export: pick the certificate and enter the server address, and the page downloads a ready `.ovpn` profile generated on the router.

## WireGuard

A sidebar lists WireGuard interfaces; the main pane shows the selected interface's peers. Interface cards show listen port, addresses, peer count and the interface public key (with copy button).

The peer table combines configuration with live runtime state: connection status derived from the last handshake, handshake age, and transfer counters, refreshed with a button. Peers and interfaces have create/edit/delete dialogs. You can also:

- **Generate client config** — generates a keypair, builds the client-side `[Interface]`/`[Peer]` file, renders it as a QR code, and adds the peer to the interface with persistent keepalive 25.
- **Import a `.conf` file** to create a tunnel from an existing WireGuard config.
- **Quick setup wizard** for a new tunnel end to end.

Key generation and some peer options are capability-gated by the connected VyOS version.
