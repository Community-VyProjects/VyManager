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

How VyOS reverts is the router's `system config-management commit-confirm action`:

- `reboot` (the VyOS default when the router sets nothing): the router reboots into its **saved** config. Every unsaved change is lost, not only the pending one, and the banner says so.
- `reload`: the router reloads the config it had before the pending commit.

To keep unsaved changes safe, either save before a risky change or set `set system config-management commit-confirm action reload` on the router.

While a commit-confirm is pending:

- A banner counts down, names the router's action and who started it, and offers Confirm. When the action is `reboot` and unsaved changes were already live when the timer was armed, it warns that they are lost too. Before arming, the unsaved-changes banner warns the same way when this instance has commit-confirm on and the router's action is `reboot`.
- Every other commit to that router is rejected with `409` until the pending commit is confirmed or expires: batches, discard, archive restore, and saving the boot config (a save would make the pending change survive a reboot revert). This holds across sites and organizations: the state belongs to the router (`host:port`), not to the instance row, so two instance rows that point at one router share one countdown. A row joins its router's shared state once its own API key has worked against that router; until then it is still blocked, but sees nothing else of the other rows. Anyone with write access on a row that shares the router can confirm.
- The countdown survives a backend restart: it is stored in the `commit_confirm_sessions` table, because the router has no call that reports a pending timer.

Starter names are shown only when every instance row on the router belongs to the starter's organization; otherwise the banner says another VyManager user started it.

Confirming stops the timer and makes the change permanent in the running config. Confirming does not save to disk — save the configuration separately when ready.

## Endpoints

- `GET /vyos/config/commit-confirm/status` — `active` plus countdown details when a commit-confirm is pending on the active instance's router. With none pending it says whether this instance arms one on every save (`enabled`) and the router's action, so the unsaved-changes banner can warn before the next save when that action is `reboot`.
- `POST /vyos/config/commit-confirm/confirm` — confirm the pending commit. Returns 409 if none is pending on the router.

Pending state is also pushed to the UI over the server-sent-events banner stream, so every connected user of every instance row on that router sees the countdown.

Implementation details are in [Talking to VyOS](../architecture/vyos-communication#commit-confirm).
