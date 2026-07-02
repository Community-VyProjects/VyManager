---
id: commit-confirm
title: Commit and confirm
sidebar_position: 4
---

# Commit and confirm

Every write in VyManager is a VyOS commit: the batch is applied to the running config atomically. Commit-confirm adds a safety net for changes that could cut you off — firewall rules, interface addresses, NAT.

## Behavior

Commit-confirm is a per-instance setting (Site Manager → edit instance): an on/off flag and a timer in minutes (default 5). It requires VyOS 1.5; on 1.4, or with the flag off, writes are plain commits.

When enabled, every batch commit arms a rollback timer on the router in the same operation. If nobody confirms before the timer expires, VyOS reverts the change — a misconfigured firewall rule that locks you out undoes itself.

While a commit-confirm is pending:

- A banner in the UI counts down and offers Confirm.
- Further write operations on that instance are rejected with `409` until the pending commit is confirmed or expires.

Confirming stops the timer and makes the change permanent in the running config. Confirming does not save to disk — save the configuration separately when ready.

## Endpoints

- `GET /vyos/config/commit-confirm/status` — `active` plus countdown details when a commit-confirm is pending on the active instance.
- `POST /vyos/config/commit-confirm/confirm` — confirm the pending commit. Returns 409 if none is active.

Pending state is also pushed to the UI over the server-sent-events banner stream, so all connected users of the instance see the countdown.

Implementation details are in [Talking to VyOS](../architecture/vyos-communication#commit-confirm).
