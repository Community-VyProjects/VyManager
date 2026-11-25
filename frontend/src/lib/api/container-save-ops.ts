/**
 * Batch ops for the container screen. Every modal diffs its draft against the
 * loaded object: a changed leaf is set, a cleared leaf is deleted, and an
 * untouched leaf emits nothing. Tag entries (devices, ports, volumes, ...) are
 * keyed by name: a new entry is created with its leaves, a removed one is
 * deleted, and a kept one only gets its changed leaves. A create diffs against
 * an empty object, so it runs through the same code. The save checks and the
 * emit read every value through the same normalizers.
 *
 * The router splits an op value on commas onto the builder parameters; only
 * the last part may hold a comma, so tag names never may.
 */
import type {
  BatchOperation,
  ContainerFeatures,
  ContainerHealthCheck,
  ContainerInstance,
  ContainerNetworkConfig,
  ContainerRegistry,
  ContainerValues,
  ContainerVerifyRules,
} from "./container";
import { isIPv4Prefix } from "../validators/ipv4-prefix";

/** The registry password loads as this mask; the save never sends it. */
export const MASKED_SECRET = "***";

// ============================================================================
// Lab bounds (node.def syntax and val_help on both labs)
// ============================================================================

export interface NumericRange {
  min: number;
  max: number;
}

export const CONTAINER_NAME_RE = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/;
export const NETWORK_NAME_RE = /^[-_a-zA-Z0-9]{1,11}$/;
export const REGISTRY_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}(?::[0-9]{1,5})?$/;
export const ENVIRONMENT_NAME_RE = /^[-_a-zA-Z0-9]+$/;
export const LABEL_NAME_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
export const HOST_NAME_RE = /^[A-Za-z0-9][-.A-Za-z0-9]*[A-Za-z0-9]$/;
/** command, entrypoint and arguments: ASCII without `"` and `'`. */
export const COMMAND_RE = /^[ !#-%&(-~]+$/;
export const CPU_QUOTA_RE = /^(0|[1-9]\d*)(\.\d{1,3})?$/;
export const MACVLAN_PARENT_RE = /^(bond|br|eth)[0-9]+(\.[0-9]+)?$/;
/**
 * `list_interfaces --type ethernet --type bonding --type bridge`, plus their
 * VLAN sub-interfaces (the interface list types those `vif`); the regex above
 * keeps only eth/bond/br parents and one VLAN level.
 */
export const MACVLAN_PARENT_TYPES = ["ethernet", "bonding", "bridge", "vif"];
const MAC_RE = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/;
/** registry mirror host-name validator. */
const MIRROR_HOST_NAME_RE = /^[A-Za-z0-9][-.A-Za-z0-9]*$/;
/** A service name the port-range validator looks up in /etc/services; the commit decides. */
const SERVICE_NAME_RE = /^[A-Za-z][-A-Za-z0-9_.+]*$/;

export const DESCRIPTION_MAX = 255;
export const IMAGE_MAX = 255;
export const LABEL_VALUE_MAX = 255;
export const REGISTRY_USERNAME_MAX = 128;
export const MEMORY_RANGE: NumericRange = { min: 0, max: 16384 };
export const SHARED_MEMORY_RANGE: NumericRange = { min: 0, max: 8192 };
export const ID_RANGE: NumericRange = { min: 0, max: 65535 };
export const STOP_TIMEOUT_RANGE: NumericRange = { min: 1, max: 60 };
export const HEALTH_INTERVAL_RANGE: NumericRange = { min: 1, max: 16384 };
export const HEALTH_RETRY_RANGE: NumericRange = { min: 0, max: 255 };
export const HEALTH_TIMEOUT_RANGE: NumericRange = { min: 1, max: 16384 };
export const PORT_RANGE: NumericRange = { min: 1, max: 65535 };
export const NETWORK_MTU_RANGE: NumericRange = { min: 68, max: 16000 };
export const TMPFS_SIZE_RANGE: NumericRange = { min: 1, max: 65535 };
export const MIRROR_PORT_RANGE: NumericRange = { min: 1, max: 65535 };


// ============================================================================
// Normalizers and emit helpers
// ============================================================================

/** Text leaf as both the save checks and the emit read it. */
export function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** A value that keeps its spaces (environment, label and sysctl values, secrets). */
function raw(value: string | null | undefined): string {
  return value ?? "";
}

/** Trimmed, non-empty, de-duplicated list in input order. */
function list(values: (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  for (const value of values ?? []) {
    const v = text(value);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function join(...parts: string[]): string {
  return parts.join(",");
}

/** Single-value leaf under `prefix` parts: set when changed, delete when cleared. */
function leaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  prefix: string[],
  before: string,
  after: string,
): void {
  if (before === after) return;
  if (after) ops.push({ op: setOp, value: join(...prefix, after) });
  else ops.push({ op: deleteOp, value: join(...prefix) });
}

/** A leaf the lab requires: a change is a set (it replaces the value); it is never deleted alone. */
function required(ops: BatchOperation[], setOp: string, prefix: string[], before: string, after: string): void {
  if (after && after !== before) ops.push({ op: setOp, value: join(...prefix, after) });
}

/** Valueless leaf: set when turned on, delete when turned off. */
function flag(ops: BatchOperation[], setOp: string, deleteOp: string, prefix: string[], before: boolean, after: boolean): void {
  if (before !== after) ops.push({ op: after ? setOp : deleteOp, value: join(...prefix) });
}

/** `multi:` leaf: per-value set and delete; an emptied list deletes the node once. */
function multi(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  deleteAllOp: string | null,
  prefix: string[],
  before: string[],
  after: string[],
): void {
  if (deleteAllOp && after.length === 0 && before.length > 0) {
    ops.push({ op: deleteAllOp, value: join(...prefix) });
    return;
  }
  for (const v of before) {
    if (!after.includes(v)) ops.push({ op: deleteOp, value: join(...prefix, v) });
  }
  for (const v of after) {
    if (!before.includes(v)) ops.push({ op: setOp, value: join(...prefix, v) });
  }
}

/** Name-keyed tag entries: removed ones are deleted, new ones created, kept ones diffed. */
function entries<T>(
  ops: BatchOperation[],
  before: Map<string, T>,
  after: Map<string, T>,
  spec: {
    create: (key: string, entry: T) => BatchOperation[];
    remove: (key: string) => BatchOperation;
    update: (key: string, was: T, now: T) => BatchOperation[];
    removeAll?: BatchOperation;
  },
): void {
  if (spec.removeAll && after.size === 0 && before.size > 0) {
    ops.push(spec.removeAll);
    return;
  }
  for (const key of before.keys()) {
    if (!after.has(key)) ops.push(spec.remove(key));
  }
  for (const [key, entry] of after) {
    const was = before.get(key);
    ops.push(...(was === undefined ? spec.create(key, entry) : spec.update(key, was, entry)));
  }
}

function inRange(value: string, range: NumericRange): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}

// ---- IP addresses -----------------------------------------------------------

interface IpValue {
  family: 4 | 6;
  bytes: number[];
}

function ipv4Bytes(value: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1);
  if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return null;
  const octets = parts.map(Number);
  return octets.every((octet) => octet <= 255) ? octets : null;
}

function ipv6Bytes(value: string): number[] | null {
  if (!/^[0-9A-Fa-f:.]+$/.test(value)) return null;
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : halves[0].split(":");
  const tail = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : [];
  const last = halves.length === 2 ? tail : head;
  let v4: number[] | null = null;
  if (last.length > 0 && last[last.length - 1].includes(".")) {
    v4 = ipv4Bytes(last.pop() as string);
    if (!v4) return null;
  }
  if ([...head, ...tail].some((group) => !/^[0-9A-Fa-f]{1,4}$/.test(group))) return null;
  const count = head.length + tail.length + (v4 ? 2 : 0);
  if (halves.length === 1 ? count !== 8 : count > 7) return null;
  const words = [
    ...head.map((group) => parseInt(group, 16)),
    ...new Array<number>(halves.length === 2 ? 8 - count : 0).fill(0),
    ...tail.map((group) => parseInt(group, 16)),
  ];
  const bytes = words.flatMap((word) => [word >> 8, word & 0xff]);
  return v4 ? [...bytes, ...v4] : bytes;
}

function parseIp(value: string): IpValue | null {
  const v4 = ipv4Bytes(value);
  if (v4) return { family: 4, bytes: v4 };
  const v6 = ipv6Bytes(value);
  return v6 ? { family: 6, bytes: v6 } : null;
}

interface IpPrefix extends IpValue {
  length: number;
}

function bitsMatch(a: number[], b: number[], length: number): boolean {
  for (let bit = 0; bit < length; bit++) {
    const byte = bit >> 3;
    const mask = 0x80 >> (bit & 7);
    if ((a[byte] & mask) !== (b[byte] & mask)) return false;
  }
  return true;
}

/** An ipv4net / ipv6net value the lab prefix validators accept (no host bits). */
function parsePrefix(value: string): IpPrefix | null {
  const slash = value.indexOf("/");
  if (slash < 0) return null;
  const lengthText = value.slice(slash + 1);
  if (!/^(0|[1-9]\d{0,2})$/.test(lengthText)) return null;
  const ip = parseIp(value.slice(0, slash));
  if (!ip) return null;
  const length = Number(lengthText);
  if (ip.family === 4) {
    return isIPv4Prefix(value) ? { ...ip, length } : null;
  }
  if (length > 128) return null;
  for (let bit = length; bit < 128; bit++) {
    if (ip.bytes[bit >> 3] & (0x80 >> (bit & 7))) return null;
  }
  return { ...ip, length };
}

function prefixContains(prefix: IpPrefix, ip: IpValue): boolean {
  return prefix.family === ip.family && bitsMatch(prefix.bytes, ip.bytes, prefix.length);
}

/** `ip_network(prefix)[1]`: the address podman keeps for the network's own gateway. */
function isFirstHost(prefix: IpPrefix, ip: IpValue): boolean {
  const first = [...prefix.bytes];
  for (let i = first.length - 1; i >= 0; i--) {
    if (first[i] < 255) {
      first[i] += 1;
      break;
    }
    first[i] = 0;
  }
  return ip.family === prefix.family && first.every((byte, i) => byte === ip.bytes[i]);
}

/** The network's first prefix of each family (the lab verify reads the first one). */
function prefixesByFamily(net: ContainerNetworkConfig): Map<number, { value: string; prefix: IpPrefix }> {
  const out = new Map<number, { value: string; prefix: IpPrefix }>();
  for (const value of list(net.prefixes)) {
    const prefix = parsePrefix(value);
    if (prefix && !out.has(prefix.family)) out.set(prefix.family, { value, prefix });
  }
  return out;
}

type AttachmentAddressIssue =
  | { key: "networkAddressNoPrefix"; values: { address: string; network: string } }
  | { key: "networkAddressOutsidePrefix"; values: { address: string; prefix: string } }
  | { key: "networkAddressReserved"; values: { address: string } };

/** Where an attachment address breaks the network's prefixes (both labs). */
function attachmentAddressIssue(address: string, ip: IpValue, net: ContainerNetworkConfig): AttachmentAddressIssue | null {
  const own = prefixesByFamily(net).get(ip.family);
  if (!own) return { key: "networkAddressNoPrefix", values: { address, network: text(net.name) } };
  if (!prefixContains(own.prefix, ip)) {
    return { key: "networkAddressOutsidePrefix", values: { address, prefix: own.value } };
  }
  if (isFirstHost(own.prefix, ip)) return { key: "networkAddressReserved", values: { address } };
  return null;
}

/** ip-address, plus a link-local IPv6 address with a zone (listen-address, mirror address). */
function parseListenIp(value: string): IpValue | null {
  const zone = value.indexOf("%");
  if (zone < 0) return parseIp(value);
  const ip = parseIp(value.slice(0, zone));
  return ip && ip.family === 6 && ip.bytes[0] === 0xfe && (ip.bytes[1] & 0xc0) === 0x80 && zone < value.length - 1
    ? ip
    : null;
}

/** port-range: one port, start-end, or a service name. */
function isPortRange(value: string): boolean {
  const range = /^([0-9]{1,5})-([0-9]{1,5})$/.exec(value);
  if (range) {
    return inRange(range[1], PORT_RANGE) && inRange(range[2], PORT_RANGE) && Number(range[1]) <= Number(range[2]);
  }
  if (/^[0-9]+$/.test(value)) return inRange(value, PORT_RANGE);
  return SERVICE_NAME_RE.test(value);
}

/** A save check result: a message key and the values it names. */
export interface SaveProblem<K extends string> {
  key: K;
  values?: Record<string, string | number>;
  /** The row list a per-row problem belongs to. */
  section?: ContainerSection;
}

function problem<K extends string>(
  key: K,
  values?: Record<string, string | number>,
  section?: ContainerSection,
): SaveProblem<K> {
  return { key, values, section };
}

// ============================================================================
// Container
// ============================================================================

/** Row lists of the container editor. */
export type ContainerSection = "devices" | "environments" | "labels" | "ports" | "sysctl" | "tmpfs" | "volumes";

interface HealthFields {
  command: string;
  interval: string;
  retry: string;
  timeout: string;
}

interface NormalizedContainer {
  name: string;
  image: string;
  description: string;
  disabled: boolean;
  allowHostNetworks: boolean;
  allowHostCgroups: boolean;
  allowHostPid: boolean;
  privileged: boolean;
  arguments: string;
  command: string;
  entrypoint: string;
  cpuQuota: string;
  memory: string;
  sharedMemory: string;
  uid: string;
  gid: string;
  hostName: string;
  logDriver: string;
  restart: string;
  stopTimeout: string;
  /** Null when the node is absent or every field is blank. */
  health: HealthFields | null;
  capabilities: string[];
  nameServers: string[];
  network: { name: string; addresses: string[]; mac: string } | null;
  devices: Map<string, { source: string; destination: string }>;
  environments: Map<string, string>;
  labels: Map<string, string>;
  ports: Map<string, { source: string; destination: string; protocol: string; listen: string[] }>;
  sysctl: Map<string, string>;
  tmpfs: Map<string, { destination: string; size: string }>;
  volumes: Map<string, { source: string; destination: string; mode: string; propagation: string }>;
}

/** A blank container, the base a create diffs against. */
export function emptyContainer(name = ""): ContainerInstance {
  return {
    name,
    image: null,
    description: null,
    disabled: false,
    allow_host_networks: false,
    allow_host_cgroups: false,
    allow_host_pid: false,
    privileged: false,
    arguments: null,
    command: null,
    entrypoint: null,
    cpu_quota: null,
    memory: null,
    shared_memory: null,
    uid: null,
    gid: null,
    host_name: null,
    log_driver: null,
    restart: null,
    stop_timeout: null,
    health_check: null,
    capabilities: [],
    name_servers: [],
    devices: [],
    environments: [],
    labels: [],
    networks: [],
    ports: [],
    sysctl_params: [],
    tmpfs_mounts: [],
    volumes: [],
  };
}

function healthFields(health: ContainerHealthCheck | null | undefined): HealthFields | null {
  if (!health) return null;
  const fields = {
    command: text(health.command),
    interval: text(health.interval),
    retry: text(health.retry),
    timeout: text(health.timeout),
  };
  return fields.command || fields.interval || fields.retry || fields.timeout ? fields : null;
}

/** Rows keyed by trimmed name; a row with a blank name is skipped (the save check rejects it when it holds data). */
function byName<R extends { name: string }, V>(rows: R[], value: (row: R) => V): Map<string, V> {
  const map = new Map<string, V>();
  for (const row of rows) {
    const key = text(row.name);
    if (key) map.set(key, value(row));
  }
  return map;
}

function normalizeContainer(c: ContainerInstance): NormalizedContainer {
  const attachment = c.networks.find((net) => text(net.name));
  return {
    name: text(c.name),
    image: text(c.image),
    description: text(c.description),
    disabled: c.disabled,
    allowHostNetworks: c.allow_host_networks,
    allowHostCgroups: c.allow_host_cgroups,
    allowHostPid: c.allow_host_pid,
    privileged: c.privileged,
    arguments: text(c.arguments),
    command: text(c.command),
    entrypoint: text(c.entrypoint),
    cpuQuota: text(c.cpu_quota),
    memory: text(c.memory),
    sharedMemory: text(c.shared_memory),
    uid: text(c.uid),
    gid: text(c.gid),
    hostName: text(c.host_name),
    logDriver: text(c.log_driver),
    restart: text(c.restart),
    stopTimeout: text(c.stop_timeout),
    health: healthFields(c.health_check),
    capabilities: list(c.capabilities),
    nameServers: list(c.name_servers),
    network: attachment
      ? { name: text(attachment.name), addresses: list(attachment.addresses), mac: text(attachment.mac) }
      : null,
    devices: byName(c.devices, (d) => ({ source: text(d.source), destination: text(d.destination) })),
    environments: byName(c.environments, (e) => raw(e.value)),
    labels: byName(c.labels, (l) => raw(l.value)),
    ports: byName(c.ports, (p) => ({
      source: text(p.source),
      destination: text(p.destination),
      protocol: text(p.protocol),
      listen: list(p.listen_addresses),
    })),
    sysctl: byName(c.sysctl_params, (s) => raw(s.value)),
    tmpfs: byName(c.tmpfs_mounts, (t) => ({ destination: text(t.destination), size: text(t.size) })),
    volumes: byName(c.volumes, (v) => ({
      source: text(v.source),
      destination: text(v.destination),
      mode: text(v.mode),
      propagation: text(v.propagation),
    })),
  };
}

/**
 * Ops that turn `original` into `draft`. A null original creates the
 * container. The name is the original's on an edit (it cannot be renamed).
 */
export function containerOps(
  original: ContainerInstance | null,
  draft: ContainerInstance,
  features: ContainerFeatures,
): BatchOperation[] {
  const after = normalizeContainer(draft);
  const n = original ? text(original.name) : after.name;
  const before = normalizeContainer(original ?? emptyContainer(n));
  const ops: BatchOperation[] = [];
  if (!original) ops.push({ op: "set_name", value: n });

  required(ops, "set_name_image", [n], before.image, after.image);
  leaf(ops, "set_name_description", "delete_name_description", [n], before.description, after.description);
  flag(ops, "set_name_disable", "delete_name_disable", [n], before.disabled, after.disabled);
  leaf(ops, "set_name_restart", "delete_name_restart", [n], before.restart, after.restart);
  if (features.log_driver) {
    leaf(ops, "set_name_log_driver", "delete_name_log_driver", [n], before.logDriver, after.logDriver);
  }
  leaf(ops, "set_name_command", "delete_name_command", [n], before.command, after.command);
  leaf(ops, "set_name_entrypoint", "delete_name_entrypoint", [n], before.entrypoint, after.entrypoint);
  leaf(ops, "set_name_arguments", "delete_name_arguments", [n], before.arguments, after.arguments);
  leaf(ops, "set_name_cpu_quota", "delete_name_cpu_quota", [n], before.cpuQuota, after.cpuQuota);
  leaf(ops, "set_name_memory", "delete_name_memory", [n], before.memory, after.memory);
  leaf(ops, "set_name_shared_memory", "delete_name_shared_memory", [n], before.sharedMemory, after.sharedMemory);
  leaf(ops, "set_name_uid", "delete_name_uid", [n], before.uid, after.uid);
  leaf(ops, "set_name_gid", "delete_name_gid", [n], before.gid, after.gid);
  leaf(ops, "set_name_host_name", "delete_name_host_name", [n], before.hostName, after.hostName);
  if (features.stop_timeout) {
    leaf(ops, "set_name_stop_timeout", "delete_name_stop_timeout", [n], before.stopTimeout, after.stopTimeout);
  }
  flag(ops, "set_name_allow_host_networks", "delete_name_allow_host_networks", [n],
    before.allowHostNetworks, after.allowHostNetworks);
  flag(ops, "set_name_allow_host_pid", "delete_name_allow_host_pid", [n], before.allowHostPid, after.allowHostPid);
  flag(ops, "set_name_privileged", "delete_name_privileged", [n], before.privileged, after.privileged);
  if (features.allow_host_cgroups) {
    flag(ops, "set_name_allow_host_cgroups", "delete_name_allow_host_cgroups", [n],
      before.allowHostCgroups, after.allowHostCgroups);
  }

  multi(ops, "set_name_capability", "delete_name_capability", "delete_name_capabilities", [n],
    before.capabilities, after.capabilities);
  multi(ops, "set_name_name_server", "delete_name_name_server", "delete_name_name_servers", [n],
    before.nameServers, after.nameServers);

  networkAttachmentOps(ops, n, before, after, features);
  if (features.health_check) healthCheckOps(ops, n, before, after);

  entries(ops, before.devices, after.devices, {
    create: (key, d) => [
      { op: "set_name_device", value: join(n, key) },
      { op: "set_name_device_source", value: join(n, key, d.source) },
      { op: "set_name_device_destination", value: join(n, key, d.destination) },
    ],
    remove: (key) => ({ op: "delete_name_device", value: join(n, key) }),
    update: (key, was, now) => {
      const out: BatchOperation[] = [];
      required(out, "set_name_device_source", [n, key], was.source, now.source);
      required(out, "set_name_device_destination", [n, key], was.destination, now.destination);
      return out;
    },
  });

  entries(ops, before.environments, after.environments, {
    create: (key, value) => [
      { op: "set_name_environment", value: join(n, key) },
      { op: "set_name_environment_value", value: join(n, key, value) },
    ],
    remove: (key) => ({ op: "delete_name_environment", value: join(n, key) }),
    update: (key, was, now) => (was === now ? [] : [{ op: "set_name_environment_value", value: join(n, key, now) }]),
    removeAll: { op: "delete_name_environments", value: n },
  });

  entries(ops, before.labels, after.labels, {
    create: (key, value) => [
      { op: "set_name_label", value: join(n, key) },
      { op: "set_name_label_value", value: join(n, key, value) },
    ],
    remove: (key) => ({ op: "delete_name_label", value: join(n, key) }),
    update: (key, was, now) => (was === now ? [] : [{ op: "set_name_label_value", value: join(n, key, now) }]),
    removeAll: { op: "delete_name_labels", value: n },
  });

  entries(ops, before.ports, after.ports, {
    create: (key, p) => {
      const out: BatchOperation[] = [
        { op: "set_name_port", value: join(n, key) },
        { op: "set_name_port_source", value: join(n, key, p.source) },
        { op: "set_name_port_destination", value: join(n, key, p.destination) },
      ];
      if (p.protocol) out.push({ op: "set_name_port_protocol", value: join(n, key, p.protocol) });
      for (const address of p.listen) out.push({ op: "set_name_port_listen_address", value: join(n, key, address) });
      return out;
    },
    remove: (key) => ({ op: "delete_name_port", value: join(n, key) }),
    update: (key, was, now) => {
      const out: BatchOperation[] = [];
      required(out, "set_name_port_source", [n, key], was.source, now.source);
      required(out, "set_name_port_destination", [n, key], was.destination, now.destination);
      leaf(out, "set_name_port_protocol", "delete_name_port_protocol", [n, key], was.protocol, now.protocol);
      multi(out, "set_name_port_listen_address", "delete_name_port_listen_address",
        "delete_name_port_listen_addresses", [n, key], was.listen, now.listen);
      return out;
    },
  });

  entries(ops, before.sysctl, after.sysctl, {
    create: (key, value) => [
      { op: "set_name_sysctl_parameter", value: join(n, key) },
      { op: "set_name_sysctl_parameter_value", value: join(n, key, value) },
    ],
    remove: (key) => ({ op: "delete_name_sysctl_parameter", value: join(n, key) }),
    update: (key, was, now) =>
      was === now ? [] : [{ op: "set_name_sysctl_parameter_value", value: join(n, key, now) }],
    removeAll: { op: "delete_name_sysctl", value: n },
  });

  if (features.tmpfs) {
    entries(ops, before.tmpfs, after.tmpfs, {
      create: (key, t) => [
        { op: "set_name_tmpfs", value: join(n, key) },
        { op: "set_name_tmpfs_destination", value: join(n, key, t.destination) },
        { op: "set_name_tmpfs_size", value: join(n, key, t.size) },
      ],
      remove: (key) => ({ op: "delete_name_tmpfs", value: join(n, key) }),
      update: (key, was, now) => {
        const out: BatchOperation[] = [];
        required(out, "set_name_tmpfs_destination", [n, key], was.destination, now.destination);
        required(out, "set_name_tmpfs_size", [n, key], was.size, now.size);
        return out;
      },
    });
  }

  entries(ops, before.volumes, after.volumes, {
    create: (key, v) => {
      const out: BatchOperation[] = [
        { op: "set_name_volume", value: join(n, key) },
        { op: "set_name_volume_source", value: join(n, key, v.source) },
        { op: "set_name_volume_destination", value: join(n, key, v.destination) },
      ];
      if (v.mode) out.push({ op: "set_name_volume_mode", value: join(n, key, v.mode) });
      if (v.propagation) out.push({ op: "set_name_volume_propagation", value: join(n, key, v.propagation) });
      return out;
    },
    remove: (key) => ({ op: "delete_name_volume", value: join(n, key) }),
    update: (key, was, now) => {
      const out: BatchOperation[] = [];
      required(out, "set_name_volume_source", [n, key], was.source, now.source);
      required(out, "set_name_volume_destination", [n, key], was.destination, now.destination);
      leaf(out, "set_name_volume_mode", "delete_name_volume_mode", [n, key], was.mode, now.mode);
      leaf(out, "set_name_volume_propagation", "delete_name_volume_propagation", [n, key],
        was.propagation, now.propagation);
      return out;
    },
  });

  return ops;
}

/** One network attachment at most: a changed pick moves it, a kept one diffs its leaves. */
function networkAttachmentOps(
  ops: BatchOperation[],
  n: string,
  before: NormalizedContainer,
  after: NormalizedContainer,
  features: ContainerFeatures,
): void {
  const was = before.network;
  const now = after.network;
  if (was && now && was.name === now.name) {
    multi(ops, "set_name_network_address", "delete_name_network_address", "delete_name_network_addresses",
      [n, now.name], was.addresses, now.addresses);
    if (features.network_mac) {
      leaf(ops, "set_name_network_mac", "delete_name_network_mac", [n, now.name], was.mac, now.mac);
    }
    return;
  }
  if (was) ops.push({ op: "delete_name_network", value: join(n, was.name) });
  if (!now) return;
  ops.push({ op: "set_name_network", value: join(n, now.name) });
  for (const address of now.addresses) {
    ops.push({ op: "set_name_network_address", value: join(n, now.name, address) });
  }
  if (features.network_mac && now.mac) {
    ops.push({ op: "set_name_network_mac", value: join(n, now.name, now.mac) });
  }
}

/** Clearing every field deletes the health-check node; its last leaf delete would leave it bare. */
function healthCheckOps(ops: BatchOperation[], n: string, before: NormalizedContainer, after: NormalizedContainer): void {
  const was = before.health;
  const now = after.health;
  if (!now) {
    if (was) ops.push({ op: "delete_name_health_check", value: n });
    return;
  }
  const empty: HealthFields = { command: "", interval: "", retry: "", timeout: "" };
  const base = was ?? empty;
  for (const field of ["command", "interval", "retry", "timeout"] as const) {
    leaf(ops, `set_name_health_check_${field}`, `delete_name_health_check_${field}`, [n], base[field], now[field]);
  }
}

export const containerDeleteOps = (name: string): BatchOperation[] => [{ op: "delete_name", value: name }];
export const containerRootDeleteOps = (): BatchOperation[] => [{ op: "delete_container_root" }];

export type ContainerProblemKey =
  | "nameRequired"
  | "nameInvalid"
  | "nameExists"
  | "imageRequired"
  | "imageInvalid"
  | "descriptionTooLong"
  | "commandInvalid"
  | "entrypointInvalid"
  | "argumentsInvalid"
  | "cpuQuotaInvalid"
  | "memoryRange"
  | "sharedMemoryRange"
  | "uidRange"
  | "gidRange"
  | "gidNeedsUid"
  | "hostNameInvalid"
  | "stopTimeoutRange"
  | "networkRequired"
  | "networkAndHost"
  | "networkAddressInvalid"
  | "networkAddressFamily"
  | "networkAddressNoPrefix"
  | "networkAddressOutsidePrefix"
  | "networkAddressReserved"
  | "networkAddressInUse"
  | "macInvalid"
  | "macInUse"
  | "nameServerInvalid"
  | "nameServerNeedsNoNameServer"
  | "healthIntervalRange"
  | "healthRetryRange"
  | "healthTimeoutRange"
  | "rowNameRequired"
  | "rowDuplicate"
  | "rowNameComma"
  | "environmentNameInvalid"
  | "labelNameInvalid"
  | "labelValueRequired"
  | "labelValueInvalid"
  | "deviceSourceRequired"
  | "deviceDestinationRequired"
  | "portSourceRequired"
  | "portDestinationRequired"
  | "portSourceInvalid"
  | "portDestinationInvalid"
  | "listenAddressInvalid"
  | "sysctlHostNetworks"
  | "tmpfsDestinationRequired"
  | "tmpfsSizeRange"
  | "volumeSourceRequired"
  | "volumeDestinationRequired";

export type ContainerProblem = SaveProblem<ContainerProblemKey>;

export interface ContainerProblemContext {
  features: ContainerFeatures;
  /** Every configured container name (a create may not reuse one). */
  existingNames: string[];
  /** Configured networks (name-server needs the attached network's no-name-server). */
  networks: ContainerNetworkConfig[];
  /** Keyword values the MAC and health-check interval accept besides an address or a number. */
  values: Pick<ContainerValues, "network_mac_keywords" | "health_check_interval_keywords">;
  /** Verify rules that differ by version (capabilities). */
  rules: ContainerVerifyRules;
  /** Every configured container (the one being edited is skipped by name). */
  containers: ContainerInstance[];
}

/** Name check shared by the container modal and the app wizard. */
export function containerNameProblem(name: string, existingNames: string[]): ContainerProblem | null {
  const n = text(name);
  if (!n) return problem("nameRequired");
  if (!CONTAINER_NAME_RE.test(n)) return problem("nameInvalid");
  if (existingNames.includes(n)) return problem("nameExists", { name: n });
  return null;
}

/** Row-list checks every named entry list shares: a name, unique after trim, no comma. */
function rowProblem<R extends { name: string }>(
  section: ContainerSection,
  rows: R[],
  hasData: (row: R) => boolean,
): ContainerProblem | null {
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const name = text(row.name);
    if (!name) {
      if (hasData(row)) return problem("rowNameRequired", { row: index + 1 }, section);
      continue;
    }
    if (seen.has(name)) return problem("rowDuplicate", { name }, section);
    if (name.includes(",")) return problem("rowNameComma", { name }, section);
    seen.add(name);
  }
  return null;
}

/** Every rule the lab verify or the node.def syntax would reject, checked before the batch. */
export function containerProblem(
  original: ContainerInstance | null,
  draft: ContainerInstance,
  context: ContainerProblemContext,
): ContainerProblem | null {
  const { features } = context;
  const macKeywords = context.values.network_mac_keywords || [];
  const intervalKeywords = context.values.health_check_interval_keywords || [];
  if (!original) {
    const nameIssue = containerNameProblem(draft.name, context.existingNames);
    if (nameIssue) return nameIssue;
  }
  const c = normalizeContainer(draft);

  if (!c.image) return problem("imageRequired");
  if (c.image.length > IMAGE_MAX || !isAscii(c.image)) return problem("imageInvalid", { max: IMAGE_MAX });
  if (c.description.length > DESCRIPTION_MAX) return problem("descriptionTooLong", { max: DESCRIPTION_MAX });
  if (c.command && !COMMAND_RE.test(c.command)) return problem("commandInvalid");
  if (c.entrypoint && !COMMAND_RE.test(c.entrypoint)) return problem("entrypointInvalid");
  if (c.arguments && !COMMAND_RE.test(c.arguments)) return problem("argumentsInvalid");
  if (c.cpuQuota && !CPU_QUOTA_RE.test(c.cpuQuota)) return problem("cpuQuotaInvalid");
  if (c.memory && !inRange(c.memory, MEMORY_RANGE)) return problem("memoryRange", { ...MEMORY_RANGE });
  if (c.sharedMemory && !inRange(c.sharedMemory, SHARED_MEMORY_RANGE)) {
    return problem("sharedMemoryRange", { ...SHARED_MEMORY_RANGE });
  }
  if (c.uid && !inRange(c.uid, ID_RANGE)) return problem("uidRange", { ...ID_RANGE });
  if (c.gid && !inRange(c.gid, ID_RANGE)) return problem("gidRange", { ...ID_RANGE });
  if (c.gid && !c.uid) return problem("gidNeedsUid");
  if (c.hostName && !HOST_NAME_RE.test(c.hostName)) return problem("hostNameInvalid");
  if (features.stop_timeout && c.stopTimeout && !inRange(c.stopTimeout, STOP_TIMEOUT_RANGE)) {
    return problem("stopTimeoutRange", { ...STOP_TIMEOUT_RANGE });
  }

  if (!c.network && !c.allowHostNetworks) return problem("networkRequired");
  if (c.network && c.allowHostNetworks) return problem("networkAndHost");
  if (c.network) {
    const attached = c.network.name;
    const net = context.networks.find((item) => item.name === attached);
    const self = text(original ? original.name : draft.name);
    const others = context.containers.filter((other) => text(other.name) !== self);
    const families = new Set<number>();
    for (const address of c.network.addresses) {
      const ip = parseIp(address);
      if (!ip) return problem("networkAddressInvalid", { address });
      if (families.has(ip.family)) return problem("networkAddressFamily");
      families.add(ip.family);
      const issue = net ? attachmentAddressIssue(address, ip, net) : null;
      if (issue) return problem(issue.key, issue.values);
      if (context.rules.unique_attachment_addresses) {
        const user = others.find((other) => other.networks.some((a) => list(a.addresses).includes(address)));
        if (user) return problem("networkAddressInUse", { address, name: user.name });
      }
    }
    const mac = c.network.mac;
    if (features.network_mac && mac && !macKeywords.includes(mac)) {
      if (!MAC_RE.test(mac)) return problem("macInvalid");
      if (context.rules.unique_attachment_addresses) {
        const user = others.find((other) => other.networks.some((a) => text(a.mac) === mac));
        if (user) return problem("macInUse", { mac, name: user.name });
      }
    }
  }
  for (const address of c.nameServers) {
    if (!parseIp(address)) return problem("nameServerInvalid", { address });
  }
  if (context.rules.name_server_needs_no_name_server && c.nameServers.length > 0 && c.network) {
    const attached = c.network.name;
    const net = context.networks.find((item) => item.name === attached);
    if (net && !net.no_name_server) return problem("nameServerNeedsNoNameServer", { network: attached });
  }

  if (features.health_check && c.health) {
    const h = c.health;
    if (h.interval && !intervalKeywords.includes(h.interval) && !inRange(h.interval, HEALTH_INTERVAL_RANGE)) {
      return problem("healthIntervalRange", { ...HEALTH_INTERVAL_RANGE });
    }
    if (h.retry && !inRange(h.retry, HEALTH_RETRY_RANGE)) return problem("healthRetryRange", { ...HEALTH_RETRY_RANGE });
    if (h.timeout && !inRange(h.timeout, HEALTH_TIMEOUT_RANGE)) {
      return problem("healthTimeoutRange", { ...HEALTH_TIMEOUT_RANGE });
    }
  }

  return (
    rowProblem("devices", draft.devices, (d) => !!(text(d.source) || text(d.destination))) ??
    rowProblem("environments", draft.environments, (e) => raw(e.value) !== "") ??
    rowProblem("labels", draft.labels, (l) => raw(l.value) !== "") ??
    rowProblem("ports", draft.ports, (p) =>
      !!(text(p.source) || text(p.destination) || text(p.protocol) || list(p.listen_addresses).length)) ??
    rowProblem("sysctl", draft.sysctl_params, (s) => raw(s.value) !== "") ??
    (features.tmpfs
      ? rowProblem("tmpfs", draft.tmpfs_mounts, (t) => !!(text(t.destination) || text(t.size)))
      : null) ??
    rowProblem("volumes", draft.volumes, (v) =>
      !!(text(v.source) || text(v.destination) || text(v.mode) || text(v.propagation))) ??
    entryProblem(c, features)
  );
}

function entryProblem(c: NormalizedContainer, features: ContainerFeatures): ContainerProblem | null {
  for (const [name, d] of c.devices) {
    if (!d.source) return problem("deviceSourceRequired", { name });
    if (!d.destination) return problem("deviceDestinationRequired", { name });
  }
  for (const name of c.environments.keys()) {
    if (!ENVIRONMENT_NAME_RE.test(name)) return problem("environmentNameInvalid", { name });
  }
  for (const [name, value] of c.labels) {
    if (!LABEL_NAME_RE.test(name)) return problem("labelNameInvalid", { name });
    if (!value) return problem("labelValueRequired", { name });
    if (value.length > LABEL_VALUE_MAX || !isAscii(value)) {
      return problem("labelValueInvalid", { name, max: LABEL_VALUE_MAX });
    }
  }
  for (const [name, p] of c.ports) {
    if (!p.source) return problem("portSourceRequired", { name });
    if (!isPortRange(p.source)) return problem("portSourceInvalid", { name, ...PORT_RANGE });
    if (!p.destination) return problem("portDestinationRequired", { name });
    if (!isPortRange(p.destination)) return problem("portDestinationInvalid", { name, ...PORT_RANGE });
    for (const address of p.listen) {
      if (!parseListenIp(address)) return problem("listenAddressInvalid", { name, address });
    }
  }
  if (c.allowHostNetworks) {
    for (const name of c.sysctl.keys()) {
      if (name.startsWith("net.")) return problem("sysctlHostNetworks", { name });
    }
  }
  if (features.tmpfs) {
    for (const [name, t] of c.tmpfs) {
      if (!t.destination) return problem("tmpfsDestinationRequired", { name });
      if (!inRange(t.size, TMPFS_SIZE_RANGE)) return problem("tmpfsSizeRange", { name, ...TMPFS_SIZE_RANGE });
    }
  }
  for (const [name, v] of c.volumes) {
    if (!v.source) return problem("volumeSourceRequired", { name });
    if (!v.destination) return problem("volumeDestinationRequired", { name });
  }
  return null;
}

// ============================================================================
// Network
// ============================================================================

interface NormalizedNetwork {
  description: string;
  prefixes: string[];
  gateways: string[];
  mtu: string;
  vrf: string;
  noNameServer: boolean;
  type: string;
  macvlanMode: string;
  macvlanParent: string;
}

function normalizeNetwork(net: ContainerNetworkConfig | null): NormalizedNetwork {
  const type = text(net?.network_type);
  return {
    description: text(net?.description),
    prefixes: list(net?.prefixes),
    gateways: list(net?.gateways),
    mtu: text(net?.mtu),
    vrf: text(net?.vrf),
    noNameServer: net?.no_name_server ?? false,
    type,
    macvlanMode: type === "macvlan" ? text(net?.macvlan_mode) : "",
    macvlanParent: type === "macvlan" ? text(net?.macvlan_parent) : "",
  };
}

/** Ops that turn `original` into `draft`; a null original creates the network. */
export function networkOps(
  original: ContainerNetworkConfig | null,
  draft: ContainerNetworkConfig,
  features: ContainerFeatures,
): BatchOperation[] {
  const n = text(original ? original.name : draft.name);
  const before = normalizeNetwork(original);
  const after = normalizeNetwork(draft);
  const ops: BatchOperation[] = [];
  if (!original) ops.push({ op: "set_network", value: n });

  leaf(ops, "set_network_description", "delete_network_description", [n], before.description, after.description);
  // A network keeps at least one prefix (save check), so the bulk delete is never needed.
  multi(ops, "set_network_prefix", "delete_network_prefix", null, [n], before.prefixes, after.prefixes);
  if (features.network_gateway) {
    multi(ops, "set_network_gateway", "delete_network_gateway", "delete_network_gateways", [n],
      before.gateways, after.gateways);
  }
  if (features.network_mtu) leaf(ops, "set_network_mtu", "delete_network_mtu", [n], before.mtu, after.mtu);
  leaf(ops, "set_network_vrf", "delete_network_vrf", [n], before.vrf, after.vrf);
  flag(ops, "set_network_no_name_server", "delete_network_no_name_server", [n],
    before.noNameServer, after.noNameServer);

  if (features.network_type) {
    if (before.type !== after.type) {
      if (before.type) ops.push({ op: "delete_network_type", value: n });
      if (after.type === "bridge") ops.push({ op: "set_network_type_bridge", value: n });
      if (after.type === "macvlan") {
        ops.push({ op: "set_network_type_macvlan", value: n });
        required(ops, "set_network_type_macvlan_mode", [n], "", after.macvlanMode);
        required(ops, "set_network_type_macvlan_parent", [n], "", after.macvlanParent);
      }
    } else if (after.type === "macvlan") {
      required(ops, "set_network_type_macvlan_mode", [n], before.macvlanMode, after.macvlanMode);
      required(ops, "set_network_type_macvlan_parent", [n], before.macvlanParent, after.macvlanParent);
    }
  }
  return ops;
}

export const networkDeleteOps = (name: string): BatchOperation[] => [{ op: "delete_network", value: name }];

export type NetworkProblemKey =
  | "nameRequired"
  | "nameInvalid"
  | "nameExists"
  | "descriptionTooLong"
  | "prefixRequired"
  | "prefixInvalid"
  | "prefixFamily"
  | "gatewayInvalid"
  | "gatewayFamily"
  | "gatewayNotInPrefix"
  | "mtuRange"
  | "macvlanModeRequired"
  | "macvlanParentRequired"
  | "macvlanParentInvalid"
  | "macvlanVrf"
  | "noNameServerInUse"
  | "prefixInUse";

export type NetworkProblem = SaveProblem<NetworkProblemKey>;

export interface NetworkProblemContext {
  features: ContainerFeatures;
  existingNames: string[];
  /** Verify rules that differ by version (capabilities). */
  rules: Pick<ContainerVerifyRules, "name_server_needs_no_name_server">;
  /** Every configured container: an edit may not break the ones attached to this network. */
  containers: ContainerInstance[];
}

/** Name check shared by the network modal and the app wizard. */
export function networkNameProblem(name: string, existingNames: string[]): NetworkProblem | null {
  const n = text(name);
  if (!n) return problem("nameRequired");
  if (!NETWORK_NAME_RE.test(n)) return problem("nameInvalid");
  if (existingNames.includes(n)) return problem("nameExists", { name: n });
  return null;
}

export function networkProblem(
  original: ContainerNetworkConfig | null,
  draft: ContainerNetworkConfig,
  context: NetworkProblemContext,
): NetworkProblem | null {
  const { features } = context;
  if (!original) {
    const nameIssue = networkNameProblem(draft.name, context.existingNames);
    if (nameIssue) return nameIssue;
  }
  const net = normalizeNetwork(draft);
  if (net.description.length > DESCRIPTION_MAX) return problem("descriptionTooLong", { max: DESCRIPTION_MAX });
  if (net.prefixes.length === 0) return problem("prefixRequired");
  const prefixes = new Map<number, IpPrefix>();
  for (const value of net.prefixes) {
    const prefix = parsePrefix(value);
    if (!prefix) return problem("prefixInvalid", { prefix: value });
    if (prefixes.has(prefix.family)) return problem("prefixFamily");
    prefixes.set(prefix.family, prefix);
  }
  if (features.network_gateway) {
    const families = new Set<number>();
    for (const gateway of net.gateways) {
      const ip = parseIp(gateway);
      if (!ip) return problem("gatewayInvalid", { gateway });
      if (families.has(ip.family)) return problem("gatewayFamily");
      families.add(ip.family);
      const prefix = prefixes.get(ip.family);
      if (!prefix || !prefixContains(prefix, ip)) return problem("gatewayNotInPrefix", { gateway });
    }
  }
  if (features.network_mtu && net.mtu && !inRange(net.mtu, NETWORK_MTU_RANGE)) {
    return problem("mtuRange", { ...NETWORK_MTU_RANGE });
  }
  if (features.network_type && net.type === "macvlan") {
    if (!net.macvlanMode) return problem("macvlanModeRequired");
    if (!net.macvlanParent) return problem("macvlanParentRequired");
    if (!MACVLAN_PARENT_RE.test(net.macvlanParent)) return problem("macvlanParentInvalid");
    if (net.vrf) return problem("macvlanVrf");
  }
  if (original) {
    const name = text(original.name);
    const attached = context.containers.filter((c) => c.networks.some((a) => text(a.name) === name));
    if (context.rules.name_server_needs_no_name_server && original.no_name_server && !net.noNameServer) {
      const user = attached.find((c) => list(c.name_servers).length > 0);
      if (user) return problem("noNameServerInUse", { name: user.name });
    }
    // The verify re-checks every attached address against the new prefixes.
    const edited = { ...draft, name, prefixes: net.prefixes };
    for (const c of attached) {
      for (const a of c.networks.filter((item) => text(item.name) === name)) {
        for (const address of list(a.addresses)) {
          const ip = parseIp(address);
          if (ip && attachmentAddressIssue(address, ip, edited)) {
            return problem("prefixInUse", { name: c.name, address });
          }
        }
      }
    }
  }
  return null;
}

// ============================================================================
// Registry
// ============================================================================

interface NormalizedRegistry {
  disabled: boolean;
  insecure: boolean;
  /** Null when the authentication node is absent (or the draft clears both fields). */
  auth: { username: string; password: string } | null;
  mirror: { address: string; hostName: string; path: string; port: string } | null;
}

function normalizeRegistry(reg: ContainerRegistry | null): NormalizedRegistry {
  const username = text(reg?.authentication?.username);
  const password = raw(reg?.authentication?.password);
  const mirror = reg?.mirror;
  return {
    disabled: reg?.disabled ?? false,
    insecure: reg?.insecure ?? false,
    auth: username || password ? { username, password } : null,
    mirror: mirror
      ? {
          address: text(mirror.address),
          hostName: text(mirror.host_name),
          path: text(mirror.path),
          port: text(mirror.port),
        }
      : null,
  };
}

/** Ops that turn `original` into `draft`; a null original creates the registry. */
export function registryOps(
  original: ContainerRegistry | null,
  draft: ContainerRegistry,
  features: ContainerFeatures,
): BatchOperation[] {
  const n = text(original ? original.name : draft.name);
  const before = normalizeRegistry(original);
  const after = normalizeRegistry(draft);
  const ops: BatchOperation[] = [];
  if (!original) ops.push({ op: "set_registry", value: n });

  flag(ops, "set_registry_disable", "delete_registry_disable", [n], before.disabled, after.disabled);
  if (features.registry_insecure) {
    flag(ops, "set_registry_insecure", "delete_registry_insecure", [n], before.insecure, after.insecure);
  }

  // username and password are required together: both are set, and clearing
  // both deletes the authentication node (the save check rejects one alone).
  const storedAuth = original?.authentication != null;
  if (!after.auth) {
    if (storedAuth) ops.push({ op: "delete_registry_auth", value: n });
  } else {
    required(ops, "set_registry_auth_username", [n], before.auth?.username ?? "", after.auth.username);
    const password = after.auth.password;
    if (password && password !== MASKED_SECRET) {
      ops.push({ op: "set_registry_auth_password", value: join(n, password) });
    }
  }

  if (features.registry_mirror) {
    const was = before.mirror;
    const now = after.mirror;
    if (!now) {
      if (was) ops.push({ op: "delete_registry_mirror", value: n });
    } else {
      const base = was ?? { address: "", hostName: "", path: "", port: "" };
      const children: BatchOperation[] = [];
      leaf(children, "set_registry_mirror_address", "delete_registry_mirror_address", [n], base.address, now.address);
      leaf(children, "set_registry_mirror_host_name", "delete_registry_mirror_host_name", [n],
        base.hostName, now.hostName);
      leaf(children, "set_registry_mirror_path", "delete_registry_mirror_path", [n], base.path, now.path);
      leaf(children, "set_registry_mirror_port", "delete_registry_mirror_port", [n], base.port, now.port);
      // A bare mirror node commits; send it only when no child set creates it.
      if (!was && !children.some((op) => op.op.startsWith("set_"))) ops.push({ op: "set_registry_mirror", value: n });
      ops.push(...children);
    }
  }
  return ops;
}

export const registryDeleteOps = (name: string): BatchOperation[] => [{ op: "delete_registry", value: name }];

export type RegistryProblemKey =
  | "nameRequired"
  | "nameInvalid"
  | "nameExists"
  | "authBoth"
  | "usernameInvalid"
  | "passwordInvalid"
  | "passwordMask"
  | "mirrorExclusive"
  | "mirrorAddressInvalid"
  | "mirrorHostNameInvalid"
  | "mirrorPathInvalid"
  | "mirrorPortRange";

export type RegistryProblem = SaveProblem<RegistryProblemKey>;

export interface RegistryProblemContext {
  features: ContainerFeatures;
  values: ContainerValues;
  existingNames: string[];
}

export function registryProblem(
  original: ContainerRegistry | null,
  draft: ContainerRegistry,
  context: RegistryProblemContext,
): RegistryProblem | null {
  if (!original) {
    const name = text(draft.name);
    if (!name) return problem("nameRequired");
    if (!REGISTRY_NAME_RE.test(name)) return problem("nameInvalid");
    if (context.existingNames.includes(name)) return problem("nameExists", { name });
  }
  const reg = normalizeRegistry(draft);
  if (reg.auth) {
    const { username, password } = reg.auth;
    const storedPassword = !!original?.authentication?.password;
    if (password === MASKED_SECRET && !storedPassword) return problem("passwordMask");
    if (!username || !password) return problem("authBoth");
    if (username.length > REGISTRY_USERNAME_MAX || !isAscii(username)) {
      return problem("usernameInvalid", { max: REGISTRY_USERNAME_MAX });
    }
    const max = context.values.registry_password_max_length;
    if (password !== MASKED_SECRET && (password.length > max || !isAscii(password))) {
      return problem("passwordInvalid", { max });
    }
  }
  if (context.features.registry_mirror && reg.mirror) {
    const m = reg.mirror;
    if (m.address && m.hostName) return problem("mirrorExclusive");
    if (m.address && !parseListenIp(m.address)) return problem("mirrorAddressInvalid");
    if (m.hostName && !MIRROR_HOST_NAME_RE.test(m.hostName)) return problem("mirrorHostNameInvalid");
    if (m.path && !m.path.startsWith("/")) return problem("mirrorPathInvalid");
    if (m.port && !inRange(m.port, MIRROR_PORT_RANGE)) return problem("mirrorPortRange", { ...MIRROR_PORT_RANGE });
  }
  return null;
}

/** Host directory the screen creates container volumes under. */
export const VOLUME_BASE = "/config/containers/";

/** Absolute path with repeated slashes collapsed, `.`/`..` resolved and no trailing slash (`/` for the root). */
function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.trim().split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

function isInside(path: string, dir: string): boolean {
  return dir === "/" ? path !== "/" : path.startsWith(`${dir}/`);
}

/**
 * Host directories under VOLUME_BASE that are safe to remove (`rm -rf`): a candidate is kept
 * when any in-use path equals it, sits inside it, or contains it.
 */
export function removableVolumeDirs(candidates: string[], inUse: string[]): string[] {
  const used = inUse.filter((path) => path.trim()).map(normalizePath);
  const overlaps = (dir: string) => used.some((path) => path === dir || isInside(path, dir) || isInside(dir, path));
  const base = normalizePath(VOLUME_BASE);
  const result: string[] = [];
  for (const candidate of candidates) {
    if (!candidate.trim()) continue;
    const dir = normalizePath(candidate);
    if (!isInside(dir, base)) continue;
    if (overlaps(dir) || result.includes(dir)) continue;
    result.push(dir);
  }
  return result;
}
