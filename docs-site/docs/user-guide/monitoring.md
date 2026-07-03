---
id: monitoring
title: Monitoring and console
sidebar_position: 9
---

# Monitoring and console

Both pages run over SSH to the router, not the HTTP API, using a per-instance SSH key that the backend generates and stores encrypted. Without SSH set up, both pages tell you to configure it first.

## SSH setup

In Site Manager, edit the instance and open its SSH section. VyManager generates an ed25519 keypair server-side and shows you the public key with the `set system login user ... authentication public-keys ...` commands to paste into the router. After committing on the router, mark the key as configured. Username (default `vyos`) and SSH port (default 22) are stored on the instance. The private key never leaves the backend; the browser talks to the backend over a WebSocket authenticated by your login session.

## Monitoring

Live command output streamed over a WebSocket. Pick a command from the list the backend offers and press Start:

- **Traffic capture** (`monitor traffic`) — choose an interface and optionally a BPF filter; a filter-builder dialog composes expressions from protocol/host/port conditions. Output is parsed into a packet table with protocol badges, source/destination, TCP flags and sizes. You can pause with buffering, inspect a packet's raw line, add fields to the filter from a context menu, and export the capture as a PCAP file assembled in the browser.
- **Logs** (`monitor log`, tail variants, VPN/OpenVPN/L2TP logs) — severity-colored log viewer with severity filter and search.
- **Conntrack events** — NEW/UPDATE/DESTROY connection events with protocol badges.
- **BGP / OSPF protocol monitors** — raw terminal output.

Stop ends the command; output is capped to a few thousand lines client-side.

## Console

A full interactive shell on the connected router, rendered with xterm.js: connect, type, resize — keystrokes and terminal size go over the WebSocket to an SSH session the backend opens with the stored key. Requires the SSH console permission, which is separate from the monitoring permission.
