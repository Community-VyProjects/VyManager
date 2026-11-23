import type {
  BatchOperation,
  ConntrackSyncConfig,
  ConntrackSyncFeatures,
} from "./conntrack-sync";
import { inRange } from "./rip-ranges";

type Op = BatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Draft (what the modal edits) and its loader
// ============================================================================

export interface ConntrackSyncInterfaceDraft {
  name: string;
  peer: string;
  port: string;
}

export interface ConntrackSyncDraft {
  interfaces: ConntrackSyncInterfaceDraft[];
  accept_protocols: string[];
  expect_sync: string[];
  sync_group: string;
  event_listen_queue_size: string;
  sync_queue_size: string;
  purge_timeout: string;
  mcast_group: string;
  listen_addresses: string[];
  ignore_addresses: string[];
  disable_external_cache: boolean;
  disable_syslog: boolean;
  startup_resync: boolean;
}

// ============================================================================
// Normalizers. The save check and the emit read values through these.
// ============================================================================

export function conntrackSyncText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function textList(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const text = conntrackSyncText(value);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

/** A decimal value without leading zeros, so "0060" and "60" are the same leaf value. */
export function conntrackSyncNumber(value: Scalar): string {
  const text = conntrackSyncText(value);
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, "") : text;
}

/** A value with a colon is IPv6; the lab validators decide the rest on commit. */
export function addressFamily(address: string): "ipv4" | "ipv6" {
  return address.includes(":") ? "ipv6" : "ipv4";
}

export function conntrackSyncDraft(config: ConntrackSyncConfig): ConntrackSyncDraft {
  return {
    interfaces: config.interfaces.map((iface) => ({
      name: iface.name,
      peer: conntrackSyncText(iface.peer),
      port: conntrackSyncText(iface.port),
    })),
    accept_protocols: [...config.accept_protocols],
    expect_sync: [...config.expect_sync],
    sync_group: conntrackSyncText(config.failover_mechanism?.vrrp?.sync_group),
    event_listen_queue_size: conntrackSyncText(config.event_listen_queue_size),
    sync_queue_size: conntrackSyncText(config.sync_queue_size),
    purge_timeout: conntrackSyncText(config.purge_timeout),
    mcast_group: conntrackSyncText(config.mcast_group),
    listen_addresses: [...config.listen_addresses],
    ignore_addresses: [...config.ignore_addresses],
    disable_external_cache: config.disable_external_cache,
    disable_syslog: config.disable_syslog,
    startup_resync: config.startup_resync,
  };
}

// ============================================================================
// Save check: combinations the lab verify rejects
// ============================================================================

export type ConntrackSyncProblemKey =
  | "interfaceRequired"
  | "interfaceNameRequired"
  | "duplicateInterface"
  | "portRange"
  | "peerFamily"
  | "mixedPeers"
  | "syncGroupRequired"
  | "expectSyncAll"
  | "eventQueueRange"
  | "syncQueueRange"
  | "purgeTimeoutRange"
  | "mcastFamily"
  | "listenFamily"
  | "listenPeerFamily";

export interface ConntrackSyncProblem {
  key: ConntrackSyncProblemKey;
  values?: Record<string, string | number>;
}

export function conntrackSyncProblem(
  draft: ConntrackSyncDraft,
  features: ConntrackSyncFeatures,
): ConntrackSyncProblem | null {
  // verify: `Interface not defined!`
  if (draft.interfaces.length === 0) return { key: "interfaceRequired" };
  const seen: string[] = [];
  const peerFamilies: string[] = [];
  for (const row of draft.interfaces) {
    const name = conntrackSyncText(row.name);
    if (!name) return { key: "interfaceNameRequired" };
    if (seen.includes(name)) return { key: "duplicateInterface", values: { name } };
    seen.push(name);
    const port = conntrackSyncNumber(row.port);
    if (port && !inRange(port, features.interface_port)) {
      const { min, max } = features.interface_port;
      return { key: "portRange", values: { name, min, max } };
    }
    const peer = conntrackSyncText(row.peer);
    if (peer) {
      const family = addressFamily(peer);
      if (!features.interface_peer.families.includes(family)) {
        return { key: "peerFamily", values: { name } };
      }
      peerFamilies.push(family);
    }
  }
  // verify: `Cannot mix unicast and multicast mode!`
  if (peerFamilies.length > 0 && peerFamilies.length !== draft.interfaces.length) {
    return { key: "mixedPeers" };
  }
  // verify: `No VRRP sync-group defined!`
  if (!conntrackSyncText(draft.sync_group)) return { key: "syncGroupRequired" };
  // verify: `Cannot configure expect-sync "all" with other protocols!`
  const expect = textList(draft.expect_sync);
  if (expect.length > 1 && expect.includes("all")) return { key: "expectSyncAll" };

  const ranges: [Scalar, ConntrackSyncProblemKey, { min: number; max: number }, boolean][] = [
    [draft.event_listen_queue_size, "eventQueueRange", features.event_listen_queue_size, true],
    [draft.sync_queue_size, "syncQueueRange", features.sync_queue_size, true],
    [draft.purge_timeout, "purgeTimeoutRange", features.purge_timeout, features.purge_timeout.supported],
  ];
  for (const [value, key, range, supported] of ranges) {
    const text = conntrackSyncNumber(value);
    if (supported && text && !inRange(text, range)) {
      return { key, values: { min: range.min, max: range.max } };
    }
  }

  const mcast = conntrackSyncText(draft.mcast_group);
  if (mcast && !features.mcast_group.families.includes(addressFamily(mcast))) {
    return { key: "mcastFamily" };
  }
  for (const address of textList(draft.listen_addresses)) {
    const family = addressFamily(address);
    if (!features.listen_address.families.includes(family)) {
      return { key: "listenFamily", values: { address } };
    }
    // 1.5 verify: `Listen-address ... does not match address-family of peer`
    if (peerFamilies.some((peer) => peer !== family)) {
      return { key: "listenPeerFamily", values: { address } };
    }
  }
  return null;
}

// ============================================================================
// Emit
// ============================================================================

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: Scalar,
  after: Scalar,
  normalize: (value: Scalar) => string = conntrackSyncText,
): void {
  const b = normalize(before);
  const a = normalize(after);
  if (a === b) return;
  if (!a) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: target === undefined ? a : `${target},${a}` });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(ops: Op[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

/** Diff a `multi:` leaf by value; a list emptied emits the bulk delete. */
function multi(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  bulkDeleteOp: string,
  before: string[],
  after: string[],
): void {
  const b = textList(before);
  const a = textList(after);
  if (a.length === 0) {
    if (b.length > 0) ops.push({ op: bulkDeleteOp });
    return;
  }
  for (const value of b) if (!a.includes(value)) ops.push({ op: deleteOp, value });
  for (const value of a) if (!b.includes(value)) ops.push({ op: setOp, value });
}

/**
 * Ops for one save. Run conntrackSyncProblem first: the lab requires an
 * interface and a VRRP sync-group, so the emit never clears either one alone
 * (removing the service is delete_conntrack_sync).
 */
export function conntrackSyncSaveOps(original: ConntrackSyncConfig, draft: ConntrackSyncDraft): Op[] {
  const ops: Op[] = [];

  const before = new Map(original.interfaces.map((iface) => [conntrackSyncText(iface.name), iface]));
  const after = new Map(
    draft.interfaces.map((row) => [conntrackSyncText(row.name), row] as const).filter(([name]) => name),
  );
  for (const name of before.keys()) {
    if (!after.has(name)) ops.push({ op: "delete_interface", value: name });
  }
  for (const [name, row] of after) {
    const loaded = before.get(name);
    if (!loaded) ops.push({ op: "set_interface", value: name });
    leaf(ops, "set_interface_peer", "delete_interface_peer", name, loaded?.peer, row.peer);
    leaf(ops, "set_interface_port", "delete_interface_port", name, loaded?.port, row.port, conntrackSyncNumber);
  }

  multi(ops, "set_accept_protocol", "delete_accept_protocol", "delete_accept_protocols",
    original.accept_protocols, draft.accept_protocols);
  multi(ops, "set_expect_sync", "delete_expect_sync", "delete_expect_syncs",
    original.expect_sync, draft.expect_sync);

  const group = conntrackSyncText(draft.sync_group);
  if (group && group !== conntrackSyncText(original.failover_mechanism?.vrrp?.sync_group)) {
    ops.push({ op: "set_failover_vrrp_sync_group", value: group });
  }

  leaf(ops, "set_event_listen_queue_size", "delete_event_listen_queue_size", undefined,
    original.event_listen_queue_size, draft.event_listen_queue_size, conntrackSyncNumber);
  leaf(ops, "set_sync_queue_size", "delete_sync_queue_size", undefined,
    original.sync_queue_size, draft.sync_queue_size, conntrackSyncNumber);
  leaf(ops, "set_purge_timeout", "delete_purge_timeout", undefined,
    original.purge_timeout, draft.purge_timeout, conntrackSyncNumber);
  leaf(ops, "set_mcast_group", "delete_mcast_group", undefined, original.mcast_group, draft.mcast_group);

  multi(ops, "set_listen_address", "delete_listen_address", "delete_listen_addresses",
    original.listen_addresses, draft.listen_addresses);
  multi(ops, "set_ignore_address", "delete_ignore_address", "delete_ignore_addresses",
    original.ignore_addresses, draft.ignore_addresses);

  flag(ops, "set_disable_external_cache", "delete_disable_external_cache",
    original.disable_external_cache, draft.disable_external_cache);
  flag(ops, "set_disable_syslog", "delete_disable_syslog", original.disable_syslog, draft.disable_syslog);
  flag(ops, "set_startup_resync", "delete_startup_resync", original.startup_resync, draft.startup_resync);

  return ops;
}
