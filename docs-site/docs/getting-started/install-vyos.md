---
id: install-vyos
title: On-box VyOS install
sidebar_position: 2.5
---

# On-box VyOS install

Run VyManager as three containers on the router it manages. After you create the first admin, login goes to this box's dashboard. There is no site list.

This is optional. Multi-site Docker Compose on a Linux host is still the default: [Docker Compose install](install-docker).

VyOS has no Compose. First boot is `set container`. The UI cannot install itself.

## What you need

- VyOS 1.4 or 1.5
- About 4 GB of RAM for postgres, backend, and frontend. 2 GB with 1 GB free is too tight. If Postgres is killed, the whole app returns 503.
- Persistent disk. Database files live at `/config/containers/vymanager-postgres` so they survive `add system image`. Overlay or flash is not enough.
- An IPv4 address you will type in the browser. This installer does not publish an IPv6 UI.
- Reachability to `ghcr.io` (default routing table, or a VRF you can name)
- SSH as the `vyos` user. Keep SSH. If the UI dies, SSH is how you get back in.

Do not put the UI on the VyOS HTTPS API port (443 by default). GraphQL stays on that API port.

Do not expose the UI port on the WAN unless you mean to. Prefer a management LAN or VPN address.

## Install

SSH in, or use the local console. Save the script, read it, then run it. Do not pipe curl into `vbash`.

```bash
curl -fsSL https://raw.githubusercontent.com/Community-VyProjects/VyManager/beta/install-vyos.sh -o install-vyos.sh
less install-vyos.sh
vbash install-vyos.sh
```

From a clone of the `beta` branch:

```bash
vbash install-vyos.sh
```

Run it from a normal `vbash` prompt, not from `configure`. The script opens its own configure session. Nested configure hangs after the image pull and never commits.

It prints the exact `set` list and asks for yes before `commit; save`. Nothing is committed until you agree. Commit can take several minutes with no output while images pull.

## Prompts

The script fills in defaults. Override them when they are wrong.

1. **Family:** 1.4 or 1.5 (detected).
2. **IP for the web UI:** one address already on this router, not `0.0.0.0`. This becomes `http://<ip>:<port>`. You do not type a URL.
3. **UI port:** default `3000`. Cannot be `8000` or the HTTPS API port. If something on the box already owns 3000, pick another port.
4. **Inbound interface for dest NAT:** the NIC your browser traffic arrives on. Default is the interface that owns the UI IP.
5. **Two dest NAT rule numbers:** labels in the NAT table. Defaults start at 9000 if those numbers are free. They must differ, and they must not already exist.
6. **VRF:** only if `ghcr.io` is unreachable from the default table. That VRF is used for the image pull and the container network.

Then it shows the URL and the proposed `set` list (secrets redacted). Yes commits and saves. No aborts with no configure session.

If commit fails, the configure session is discarded. Images that already pulled may stay.

Re-run is safe when the stack already exists: it will not rewrite container env or images. It can still add dest NAT if those rule numbers are free, which is how you fix a box that has containers but no UI reachability.

## Dest NAT (why those prompts exist)

The three containers sit on a private network (`172.31.x.0/24`). Your browser never uses those addresses. The containers talk to each other there. They reach the VyOS HTTPS API at the same IPv4 you picked for the UI, not `127.0.0.1` (that would be inside the container, not the router).

VyOS cannot publish `container … port` on that kind of network. Mapping host ports that way leaves a listening socket that TCP-connects and then hangs.

So the installer does not publish container ports. It adds two **destination NAT** rules on the router:

1. **Web UI.** A TCP packet that arrives on the inbound interface, destined to `UI_IP:UI_PORT`, is rewritten to the frontend container, port 3000.
2. **API / websocket.** A TCP packet to `UI_IP:8000` on that same interface is rewritten to the backend container, port 8000. The dashboard, console, and monitoring need this.

Example: UI IP `10.10.10.1`, inbound `eth1`, UI port `3000`.

- You open `http://10.10.10.1:3000`. Dest NAT sends that session to the frontend container.
- The browser also uses `10.10.10.1:8000` for websockets. Dest NAT sends that to the backend container.

Which interface to pick: the one the packet hits the router on. Opening the UI from the LAN that owns that IP: keep the default. Reaching it through VPN or another NIC: select that interface. Wrong interface means the NAT rule never matches and the page hangs. One install covers one arrival path.

What dest NAT is **not**:

- Not source NAT / masquerade. Outbound internet from the router is unchanged.
- Not a firewall rule. If a firewall or zone-policy drops 3000 or 8000, the page will not load. The installer does not write firewall, source NAT, or zone-policy. Those stay yours.
- Not a change to SSH or `service https`. Existing listen-address, port, and keys are left alone.

Rule numbers (9000 / 9001 or whatever you picked) are only IDs in `nat destination`. They do not have to match the UI port.

If you later filter traffic, allow TCP to the UI IP on the UI port and on 8000 from the networks that should reach the management UI. Do not open those ports on the WAN as a shortcut.

## What the script will not do

- Write firewall, source NAT, or zone-policy
- Disable SSH, or change an existing SSH listen-address, port, or keys
- Change an existing HTTPS listen-address or port
- Bind the UI to the VyOS API port
- Use a well-known API key (`vyos`)
- Delete or restart containers it does not own

If SSH is missing, it enables `service ssh` and stops there for SSH. If HTTPS is new, API listen-address is the UI IP, not every interface.

## After commit

1. Open the printed URL (`http://<ip>:3000`).
2. Create the first local admin. That is the only onboarding step. No site, no host form. Registration closes after that.
3. Login lands on the dashboard and connects to this router.

Users, OIDC, API tokens, backup, and this router's instance settings (API key, version, SSH, commit-confirm, timeout) live under **Administration**. Instance timeout defaults to 300 seconds so large commits do not look like a hang.

Do not delete `vymanager-postgres`, `vymanager-backend`, `vymanager-frontend`, network `vymanager`, or `/config/containers/vymanager-*` from Containers / Apps. That would drop the UI and the database. Updates are image pull then restart: Administration, Update VyManager, or re-run `install-vyos.sh`. Restart is allowed. Delete is not.

## If the UI dies

SSH in. That is the out-of-band path.

If a firewall, NAT, VRF, or `service https` edit cuts the UI before you confirm, [commit-confirm](../reference/commit-confirm) rolls the change back. Do not disable commit-confirm on this box.

A reboot takes the UI down with the router. SSH still works. The containers start again with the router.

## Backup

A `.vymgr` backup of **this** router restores. A multi-site / fleet backup is refused so it cannot import extra routers or wipe the seeded instance. See [Backups](../operations/backups).

## TRUSTED_ORIGINS

The installer sets `TRUSTED_ORIGINS` (and the Better Auth URL) to the one URL it built, for example `http://10.10.10.1:3000`. Login cookies and websockets only work from that origin.

If you later open the UI by another name (VPN hostname, reverse proxy), add that exact URL to the container environment and restart. Raw IP plus a hostname as two different URLs without listing both will break login. OIDC also needs the router to reach the IdP. Local password always remains.

Details: [Environment variables](environment-variables).
