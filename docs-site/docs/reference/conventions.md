---
id: conventions
title: API conventions
sidebar_position: 3
---

# API conventions

## The endpoint triple

Most VyOS features expose the same three endpoints under `/vyos/<feature>`:

- `GET /vyos/<feature>/capabilities` — feature flags for the connected VyOS version: `{version, version_info: {is_1_4, is_1_5}, features: {<name>: {supported, description}}}`. Read this before assuming a field exists.
- `GET /vyos/<feature>/config` — the feature's configuration, normalized from the router's config tree. Served from the backend's in-memory config cache; pass `?refresh=true` to force a re-read from the router.
- `POST /vyos/<feature>/batch` — set/delete operations applied and committed atomically. Body shape is feature-specific (see the generated reference); the response is `{success, data?, error?}`.

Rule-based features (firewall, NAT, policies) additionally expose a `/reorder` endpoint that renumbers rules in one commit.

## Config lifecycle

VyOS distinguishes the running config from the saved boot config. VyManager tracks this per instance under `/vyos/config`:

- `GET /vyos/config/snapshot` — the config as of the last save.
- `GET /vyos/config/diff` — structured diff of running config vs. that snapshot: what is unsaved.
- `POST /vyos/config/save` — write the running config to `/config/config.boot` (optional `file` parameter for another path) and reset the snapshot.
- `POST /vyos/config/discard` — revert all unsaved changes by computing and applying the reverse of the diff.
- `POST /vyos/config/refresh` — drop the backend's cached config and re-read from the router.

The UI polls the diff endpoint to show the unsaved-changes indicator.

## No pagination

No endpoint is paginated. Collection responses return the full set; sizes are bounded by what fits in a router configuration.

## Identifiers

Sites, instances, users and tokens use database IDs (cuid strings). Router-side objects (interfaces, rules, groups) are addressed by their VyOS names and rule numbers.
