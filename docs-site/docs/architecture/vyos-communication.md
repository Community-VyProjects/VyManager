---
id: vyos-communication
title: Talking to VyOS
sidebar_position: 2
---

# Talking to VyOS

All router communication goes through the VyOS HTTP API. The backend ships a vendored, customized copy of pyvyos under `backend/pyvyos`; it is not the PyPI package.

## Client and endpoints

`pyvyos.VyDevice` wraps the VyOS API endpoints. The service layer uses:

| VyDevice method | VyOS endpoint | Purpose |
|---|---|---|
| `retrieve_show_config` | `/retrieve` | Read configuration subtrees |
| `show` | `/show` | Operational-mode show commands |
| `generate` | `/generate` | Op-mode generators (e.g. OpenVPN client configs) |
| `configure_set` / `configure_delete` / `configure_multiple_op` | `/configure` | Configuration changes |
| `config_file_save` / `config_file_load` | `/config-file` | Save or load `config.boot` |
| `image_add` / `image_delete` | `/image` | System image management |
| `reboot` / `poweroff` | `/reboot`, `/poweroff` | Power actions |
| `reset` | `/reset` | Op-mode reset commands |

The backend also queries the router's `/graphql` endpoint directly for streaming dashboard data (interface counters, system info, WireGuard peers) and DHCP leases. That is why GraphQL must be enabled on the router for the dashboard to populate.

## Per-instance services

`session_vyos_service.get_session_vyos_service(request)` returns a `VyOSService` for the caller's active instance. Services are cached in an in-memory registry keyed by instance ID, so the connection settings are built once per instance. Changing an instance's credentials clears its cache entry.

Each `VyOSService` also caches the router's full configuration (`show configuration json pretty`) in memory. Read endpoints work from this cache; write operations and explicit refreshes invalidate it. Restarting the backend clears all caches — router state is re-read on the next request.

## Batches and commits

Feature endpoints never send individual `set` commands. A router handler collects the requested changes into a version-aware batch builder, which produces a list of `{op, path}` operations. The whole batch goes to the router in a single `configure_multiple_op` call, which VyOS applies and commits atomically: either the entire batch commits or none of it does.

The builders delegate command syntax to mappers under `vyos_mappers/`, which hold the differences between VyOS 1.4 and 1.5. The instance's stored `vyosVersion` selects the mapper; that is the whole version-awareness mechanism.

## Commit-confirm

Instances can enable commit-confirm (per-instance setting, with a timer in minutes). When enabled and the router runs VyOS 1.5, every batch is applied with a rollback timer: the backend posts `{"commands": [...], "confirm_time": N}` to `/configure` so the timer is armed atomically with the commit. If nobody confirms before the timer expires, VyOS reverts the changes.

Confirming posts `{"op": "confirm"}` to `/config-file`. While a commit-confirm is pending for an instance, further batches are rejected with 409 until it is confirmed or expires. On VyOS 1.4, or when the setting is off, batches fall back to a plain commit. Timer state is tracked in the backend (`commit_confirm_state.py`) and surfaced to the UI through server-sent events. See [Commit and confirm](../reference/commit-confirm) for the operator view.

## TLS

Each instance stores `protocol`, `port`, `verifySsl` and `timeout`. With `verifySsl` off (the default) the backend skips certificate verification and suppresses the urllib3 insecure-request warning. With it on, the certificate must chain to a CA the backend trusts — the container imports custom CAs from a mounted directory at startup (see [Custom CA certificates](../getting-started/install-docker#custom-ca-certificates)).
