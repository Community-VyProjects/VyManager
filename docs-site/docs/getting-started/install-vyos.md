---
id: install-vyos
title: On-box VyOS install
sidebar_position: 2.5
---

# On-box VyOS install

Run VyManager as containers on the router it manages. This is the appliance profile (`VYMANAGER_MODE=appliance`): login lands on this box, not a site picker.

VyOS has no Docker Compose. First boot is `set container`. The UI cannot create itself.

## Download, read, then run

Do not pipe the script into `vbash`. Save it, read it, then run it:

```bash
curl -fsSL https://raw.githubusercontent.com/Community-VyProjects/VyManager/beta/install-vyos.sh -o install-vyos.sh
less install-vyos.sh
vbash install-vyos.sh
```

From a clone of the `beta` branch:

```bash
vbash install-vyos.sh
```

Run it as the `vyos` user (SSH or local console). It walks through SSH, the HTTPS API, GraphQL, and the three containers, prints the exact `set` list, and requires yes before `commit; save`. There is no silent commit.

## What it does

- Enables `service ssh` only when it is missing. It never changes an existing SSH listen-address, port, or keys, and it never disables SSH.
- Enables the HTTPS API, GraphQL, and (on devices that have it) REST. A new API key is a long random value, not a well-known string. If HTTPS is new, API listen-address is the web UI IP you picked, not `0.0.0.0`. Existing listen-address and port are left alone.
- Creates `vymanager-postgres`, `vymanager-backend`, and `vymanager-frontend` on a private container network. Postgres data is `/config/containers/vymanager-postgres` (persistent disk under `/config`, same layout as Apps).
- Binds the web UI to one host IP (not every interface). It builds `http://<that-ip>:<port>` for you; you do not type a URL.
- Sets appliance env: `VYMANAGER_MODE=appliance`, generated database and auth secrets, `SSH_ENCRYPTION_KEY`, `TRUSTED_ORIGINS` from that URL, and `VYMANAGER_APPLIANCE_HOST` as the same IP so containers can reach the HTTPS API (not `127.0.0.1` inside a container netns).
- Pulls `postgres:16-alpine` and the `ghcr.io/community-vyprojects/vymanager-*:beta` images. If the default routing table cannot reach ghcr.io, it asks for a VRF.

It does **not** write firewall, NAT, or zone-policy. Topologies differ too much. You still need the UI IP reachable from your browser.

On failure it discards the configure session. Images that already pulled may stay.

## Ports and resources

- UI default `3000`, bound to the IP you chose. It must not be the VyOS API port (`443` by default, or whatever `service https port` already is).
- HTTPS/GraphQL stays on the router API port. The UI does not bind that port.
- Budget about 1 GB RAM for the three containers plus forwarding headroom. Postgres must live on persistent disk, not overlay/flash.

SSH is the out-of-band path if a later firewall or `service https` edit cuts the UI.

## After commit

Open the printed URL (`http://<ip>:3000` or `http://[<ipv6>]:3000`) and create the first local admin. Registration closes after that. The backend seeds this router as the local instance and login auto-connects it.

See [Environment variables](environment-variables) for the appliance keys. Multi-site Docker Compose remains the default; use [Docker Compose install](install-docker) on a Linux host.
