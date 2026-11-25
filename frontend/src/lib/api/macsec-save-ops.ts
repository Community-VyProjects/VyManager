/**
 * Batch ops and save checks for the MACsec interface screen. The create and
 * edit dialogs share one draft; a create diffs it against nothing, an edit
 * against the loaded interface. A changed leaf is set, a cleared leaf is
 * deleted, an untouched leaf emits nothing. Static peers and DHCPv6 prefix
 * delegations are keyed by name: a new entry is created with its leaves, a
 * removed one is deleted, a kept one only gets its changed leaves. The save
 * check and the emit read every value through the same normalizer.
 *
 * The router binds the interface from the request; an op with several extra
 * parameters takes them colon-joined in `value` (`peer:key`, `pd:iface:sla`),
 * so a peer name never holds a colon.
 */
import type {
  MacsecBatchOperation,
  MacsecCapabilities,
  MacsecInterface,
} from "./macsec";
import { isValidIPv4, isValidIPv4CIDR, isValidIPv6CIDR } from "../validators/firewall";
import { isIPv4Prefix } from "../validators/ipv4-prefix";

/** Keys load from GET /config as this mask; the save never sends it. */
export const MASKED_SECRET = "***";

// ============================================================================
// Lab bounds (node.def syntax and val_help on 1.4 and 1.5)
// ============================================================================

export interface NumericRange {
  min: number;
  /** Absent when the leaf has no upper bound. */
  max?: number;
}

export const MTU_RANGE: NumericRange = { min: 68, max: 16000 };
export const REPLAY_WINDOW_RANGE: NumericRange = { min: 0, max: 4294967295 };
export const MKA_PRIORITY_RANGE: NumericRange = { min: 0, max: 255 };
export const ADJUST_MSS_RANGE: NumericRange = { min: 536, max: 65535 };
export const ARP_CACHE_TIMEOUT_RANGE: NumericRange = { min: 1, max: 86400 };
export const BASE_REACHABLE_TIME_RANGE: NumericRange = { min: 1, max: 86400 };
export const DAD_TRANSMITS_RANGE: NumericRange = { min: 0 };
export const DEFAULT_ROUTE_DISTANCE_RANGE: NumericRange = { min: 1, max: 255 };
export const PD_ID_RANGE: NumericRange = { min: 0 };
export const PD_LENGTH_RANGE: NumericRange = { min: 32, max: 64 };
export const PD_ADDRESS_RANGE: NumericRange = { min: 0 };
export const PD_SLA_ID_RANGE: NumericRange = { min: 0, max: 65535 };
export const DESCRIPTION_MAX = 255;
export const PEER_NAME_MAX = 100;

/** `ipv6 accept-dad` values (val_help 0, 1, 2). */
export const ACCEPT_DAD_VALUES = ["0", "1", "2"];
/** The `adjust-mss` keyword beside a number. */
export const CLAMP_MSS_TO_PMTU = "clamp-mss-to-pmtu";
/** `source-interface` is `list_interfaces --type ethernet`. */
export const SOURCE_INTERFACE_TYPE = "ethernet";

export const INTERFACE_NAME_RE = /^macsec[0-9]+$/;
const SECRET_RE = /^([A-Fa-f0-9]{32}|[A-Fa-f0-9]{64})$/;
const CKN_RE = /^[A-Fa-f0-9]{2,64}$/;
const MAC_RE = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/;
const PEER_NAME_RE = new RegExp(`^[^ :]{1,${PEER_NAME_MAX}}$`);
const INTERFACE_IDENTIFIER_RE = /^::[0-9A-Fa-f]{1,4}(:[0-9A-Fa-f]{1,4}){0,3}$/;
const DHCP_TEXT_RE = /^[-_a-zA-Z0-9.\s]+$/;
const HEX_COLON_RE = /^([0-9A-Fa-f]{2}:)*[0-9A-Fa-f]{2}$/;
const HOST_NAME_RE = /^[A-Za-z0-9][-.A-Za-z0-9]*[A-Za-z0-9]$/;
const DUID_RE = /^([0-9A-Fa-f]{2}:){0,127}[0-9A-Fa-f]{2}$/;
const CIDR_LENGTH_RE = /\/(0|[1-9]\d{0,2})$/;

/** Hex digits a key needs with `encrypt` on, by cipher. */
const KEY_HEX_LENGTH: Record<string, number> = { "gcm-aes-128": 32, "gcm-aes-256": 64 };

/** Hex digits a key of this cipher has (undefined for an unknown cipher). */
export function macsecKeyHexLength(cipher: string): number | undefined {
  return KEY_HEX_LENGTH[cipher];
}

// ============================================================================
// Draft (what the dialog edits)
// ============================================================================

export type MacsecMode = "mka" | "static";

export interface MacsecPeerDraft {
  name: string;
  key: string;
  mac: string;
  disable: boolean;
}

export interface MacsecPdInterfaceDraft {
  name: string;
  address: string;
  sla_id: string;
}

export interface MacsecPdDraft {
  id: string;
  length: string;
  interfaces: MacsecPdInterfaceDraft[];
}

export interface MacsecIpDraft {
  adjust_mss: string;
  arp_cache_timeout: string;
  disable_arp_filter: boolean;
  disable_forwarding: boolean;
  enable_arp_accept: boolean;
  enable_arp_announce: boolean;
  enable_arp_ignore: boolean;
  enable_directed_broadcast: boolean;
  enable_proxy_arp: boolean;
  proxy_arp_pvlan: boolean;
  source_validation: string;
}

export interface MacsecIpv6Draft {
  accept_dad: string;
  address_autoconf: boolean;
  address_eui64: string[];
  address_no_default_link_local: boolean;
  address_interface_identifier: string;
  adjust_mss: string;
  base_reachable_time: string;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string;
  source_validation: string;
}

export interface MacsecDhcpDraft {
  client_id: string;
  default_route_distance: string;
  host_name: string;
  mtu: boolean;
  no_default_route: boolean;
  reject: string[];
  user_class: string;
  vendor_class_id: string;
}

export interface MacsecDhcpv6Draft {
  duid: string;
  no_release: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  pd: MacsecPdDraft[];
}

export interface MacsecDraft {
  name: string;
  source_interface: string;
  description: string;
  mtu: string;
  vrf: string;
  disabled: boolean;
  /** Static CIDR addresses; `dhcp` / `dhcpv6` are the two flags below. */
  addresses: string[];
  dhcp: boolean;
  dhcpv6: boolean;
  cipher: string;
  encrypt: boolean;
  replay_window: string;
  mode: MacsecMode;
  mka_cak: string;
  mka_ckn: string;
  mka_priority: string;
  static_key: string;
  peers: MacsecPeerDraft[];
  ip: MacsecIpDraft;
  ipv6: MacsecIpv6Draft;
  dhcp_options: MacsecDhcpDraft;
  dhcpv6_options: MacsecDhcpv6Draft;
  mirror_ingress: string;
  mirror_egress: string;
  redirect: string;
}

type Caps = MacsecCapabilities | null | undefined;

/** 1.5-only leaves the screen offers only when the device has them. */
export type MacsecVersionedFeature =
  | "ipv6_address_interface_identifier"
  | "dhcpv6_options_no_request_dns"
  | "dhcpv6_options_no_request_domain_name";

export function macsecSupports(caps: Caps, flag: MacsecVersionedFeature): boolean {
  return caps?.features?.[flag]?.supported === true;
}

export function macsecCipherValues(caps: Caps): string[] {
  return caps?.values?.cipher || [];
}

export function macsecSourceValidationValues(caps: Caps): string[] {
  return caps?.values?.source_validation || [];
}

/** First `macsecN` that no configured interface uses. */
export function nextMacsecName(existingNames: string[]): string {
  let n = 0;
  while (existingNames.includes(`macsec${n}`)) n += 1;
  return `macsec${n}`;
}

/** Next `peerN` used by neither a row nor a stored peer. */
export function nextPeerName(rows: MacsecPeerDraft[], original: MacsecInterface | null): string {
  const used = new Set([
    ...rows.map((row) => row.name.trim()),
    ...(original?.security?.static?.peers ?? []).map((peer) => peer.name),
  ]);
  let n = 0;
  while (used.has(`peer${n}`)) n += 1;
  return `peer${n}`;
}

/** Next prefix delegation id used by neither a row nor a stored entry. */
export function nextPdId(rows: MacsecPdDraft[], original: MacsecInterface | null): string {
  const used = new Set([
    ...rows.map((row) => row.id.trim()),
    ...Object.keys(original?.dhcpv6_options?.pd ?? {}),
  ]);
  let n = 0;
  while (used.has(String(n))) n += 1;
  return String(n);
}

const s = (value: string | null | undefined): string => value ?? "";

function emptyIp(): MacsecIpDraft {
  return {
    adjust_mss: "",
    arp_cache_timeout: "",
    disable_arp_filter: false,
    disable_forwarding: false,
    enable_arp_accept: false,
    enable_arp_announce: false,
    enable_arp_ignore: false,
    enable_directed_broadcast: false,
    enable_proxy_arp: false,
    proxy_arp_pvlan: false,
    source_validation: "",
  };
}

function emptyIpv6(): MacsecIpv6Draft {
  return {
    accept_dad: "",
    address_autoconf: false,
    address_eui64: [],
    address_no_default_link_local: false,
    address_interface_identifier: "",
    adjust_mss: "",
    base_reachable_time: "",
    disable_forwarding: false,
    dup_addr_detect_transmits: "",
    source_validation: "",
  };
}

export function emptyMacsecDhcp(): MacsecDhcpDraft {
  return {
    client_id: "",
    default_route_distance: "",
    host_name: "",
    mtu: false,
    no_default_route: false,
    reject: [],
    user_class: "",
    vendor_class_id: "",
  };
}

export function emptyMacsecDhcpv6(): MacsecDhcpv6Draft {
  return {
    duid: "",
    no_release: false,
    no_request_dns: false,
    no_request_domain_name: false,
    parameters_only: false,
    rapid_commit: false,
    temporary: false,
    pd: [],
  };
}

/** The dialog's starting draft: the loaded interface, or a new one. */
export function macsecDraft(
  existing: MacsecInterface | null,
  caps: Caps,
  existingNames: string[] = [],
): MacsecDraft {
  const sec = existing?.security ?? null;
  const ip = existing?.ip ?? null;
  const ipv6 = existing?.ipv6 ?? null;
  const dhcp = existing?.dhcp_options ?? null;
  const dhcpv6 = existing?.dhcpv6_options ?? null;
  const addresses = existing?.addresses ?? [];
  return {
    name: existing ? existing.name : nextMacsecName(existingNames),
    source_interface: s(existing?.source_interface),
    description: s(existing?.description),
    mtu: s(existing?.mtu),
    vrf: s(existing?.vrf),
    disabled: existing?.disabled ?? false,
    addresses: addresses.filter((a) => a !== "dhcp" && a !== "dhcpv6"),
    dhcp: addresses.includes("dhcp"),
    dhcpv6: addresses.includes("dhcpv6"),
    cipher: existing ? s(sec?.cipher) : macsecCipherValues(caps)[0] || "",
    encrypt: existing ? sec?.encrypt ?? false : true,
    replay_window: s(sec?.replay_window),
    mode: sec?.static ? "static" : "mka",
    mka_cak: s(sec?.mka?.cak),
    mka_ckn: s(sec?.mka?.ckn),
    mka_priority: s(sec?.mka?.priority),
    static_key: s(sec?.static?.key),
    peers: (sec?.static?.peers ?? []).map((peer) => ({
      name: peer.name,
      key: s(peer.key),
      mac: s(peer.mac),
      disable: peer.disable,
    })),
    ip: ip
      ? {
          adjust_mss: s(ip.adjust_mss),
          arp_cache_timeout: s(ip.arp_cache_timeout),
          disable_arp_filter: ip.disable_arp_filter,
          disable_forwarding: ip.disable_forwarding,
          enable_arp_accept: ip.enable_arp_accept,
          enable_arp_announce: ip.enable_arp_announce,
          enable_arp_ignore: ip.enable_arp_ignore,
          enable_directed_broadcast: ip.enable_directed_broadcast,
          enable_proxy_arp: ip.enable_proxy_arp,
          proxy_arp_pvlan: ip.proxy_arp_pvlan,
          source_validation: s(ip.source_validation),
        }
      : emptyIp(),
    ipv6: ipv6
      ? {
          accept_dad: s(ipv6.accept_dad),
          address_autoconf: ipv6.address_autoconf,
          address_eui64: [...(ipv6.address_eui64 ?? [])],
          address_no_default_link_local: ipv6.address_no_default_link_local,
          address_interface_identifier: s(ipv6.address_interface_identifier),
          adjust_mss: s(ipv6.adjust_mss),
          base_reachable_time: s(ipv6.base_reachable_time),
          disable_forwarding: ipv6.disable_forwarding,
          dup_addr_detect_transmits: s(ipv6.dup_addr_detect_transmits),
          source_validation: s(ipv6.source_validation),
        }
      : emptyIpv6(),
    dhcp_options: dhcp
      ? {
          client_id: s(dhcp.client_id),
          default_route_distance: s(dhcp.default_route_distance),
          host_name: s(dhcp.host_name),
          mtu: dhcp.mtu,
          no_default_route: dhcp.no_default_route,
          reject: [...(dhcp.reject ?? [])],
          user_class: s(dhcp.user_class),
          vendor_class_id: s(dhcp.vendor_class_id),
        }
      : emptyMacsecDhcp(),
    dhcpv6_options: dhcpv6
      ? {
          duid: s(dhcpv6.duid),
          no_release: dhcpv6.no_release,
          no_request_dns: dhcpv6.no_request_dns,
          no_request_domain_name: dhcpv6.no_request_domain_name,
          parameters_only: dhcpv6.parameters_only,
          rapid_commit: dhcpv6.rapid_commit,
          temporary: dhcpv6.temporary,
          pd: Object.entries(dhcpv6.pd ?? {}).map(([id, pd]) => ({
            id,
            length: s(pd.length),
            interfaces: Object.entries(pd.interfaces ?? {}).map(([name, iface]) => ({
              name,
              address: s(iface.address),
              sla_id: s(iface.sla_id),
            })),
          })),
        }
      : emptyMacsecDhcpv6(),
    mirror_ingress: s(existing?.mirror_ingress),
    mirror_egress: s(existing?.mirror_egress),
    redirect: s(existing?.redirect),
  };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

/** Every text value, trimmed. A secret equal to MASKED_SECRET is the stored key. */
function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Trimmed, non-empty, de-duplicated list in input order. */
function list(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const v = text(value);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

interface PeerRow {
  /** Position of the row in the draft (what the screen numbers). */
  index: number;
  name: string;
  key: string;
  mac: string;
  disable: boolean;
}

interface PdInterfaceRow {
  name: string;
  address: string;
  sla_id: string;
}

interface PdRow {
  /** Position of the row in the draft (what the screen numbers). */
  index: number;
  id: string;
  length: string;
  interfaces: PdInterfaceRow[];
}

/** Trimmed peer rows; a row the user added and never filled is dropped. */
function peerRows(peers: MacsecPeerDraft[]): PeerRow[] {
  return peers
    .map((p, index) => ({ index, name: text(p.name), key: text(p.key), mac: text(p.mac), disable: p.disable }))
    .filter((p) => p.name || p.key || p.mac || p.disable);
}

function pdInterfaceRows(rows: MacsecPdInterfaceDraft[]): PdInterfaceRow[] {
  return rows
    .map((r) => ({ name: text(r.name), address: text(r.address), sla_id: text(r.sla_id) }))
    .filter((r) => r.name || r.address || r.sla_id);
}

function pdRows(rows: MacsecPdDraft[]): PdRow[] {
  return rows
    .map((r, index) => ({ index, id: text(r.id), length: text(r.length), interfaces: pdInterfaceRows(r.interfaces) }))
    .filter((r) => r.id || r.length || r.interfaces.length > 0);
}

interface Norm {
  source: string;
  description: string;
  mtu: string;
  vrf: string;
  disabled: boolean;
  addresses: string[];
  dhcp: boolean;
  dhcpv6: boolean;
  cipher: string;
  encrypt: boolean;
  replay: string;
  mode: MacsecMode;
  cak: string;
  ckn: string;
  priority: string;
  staticKey: string;
  peers: Map<string, Omit<PeerRow, "name" | "index">>;
  ip: MacsecIpDraft;
  ipv6: MacsecIpv6Draft;
  dhcpOptions: MacsecDhcpDraft;
  dhcpv6Options: Omit<MacsecDhcpv6Draft, "pd">;
  pd: Map<string, { length: string; interfaces: Map<string, { address: string; sla_id: string }> }>;
  mirrorIngress: string;
  mirrorEgress: string;
  redirect: string;
}

function normalize(d: MacsecDraft, caps: Caps): Norm {
  const addresses = list(d.addresses).filter((a) => a !== "dhcp" && a !== "dhcpv6");
  if (d.dhcp) addresses.push("dhcp");
  if (d.dhcpv6) addresses.push("dhcpv6");
  const peers = new Map<string, Omit<PeerRow, "name" | "index">>();
  for (const row of peerRows(d.peers)) {
    if (row.name) peers.set(row.name, { key: row.key, mac: row.mac, disable: row.disable });
  }
  const pd: Norm["pd"] = new Map();
  for (const row of pdRows(d.dhcpv6_options.pd)) {
    if (!row.id) continue;
    const interfaces = new Map<string, { address: string; sla_id: string }>();
    for (const iface of row.interfaces) {
      if (iface.name) interfaces.set(iface.name, { address: iface.address, sla_id: iface.sla_id });
    }
    pd.set(row.id, { length: row.length, interfaces });
  }
  const v6 = d.ipv6;
  const o6 = d.dhcpv6_options;
  return {
    source: text(d.source_interface),
    description: text(d.description),
    mtu: text(d.mtu),
    vrf: text(d.vrf),
    disabled: d.disabled,
    addresses,
    dhcp: d.dhcp,
    dhcpv6: d.dhcpv6,
    cipher: text(d.cipher),
    encrypt: d.encrypt,
    replay: text(d.replay_window),
    mode: d.mode,
    cak: text(d.mka_cak),
    ckn: text(d.mka_ckn),
    priority: text(d.mka_priority),
    staticKey: text(d.static_key),
    peers,
    ip: {
      ...d.ip,
      adjust_mss: text(d.ip.adjust_mss),
      arp_cache_timeout: text(d.ip.arp_cache_timeout),
      source_validation: text(d.ip.source_validation),
    },
    ipv6: {
      ...v6,
      accept_dad: text(v6.accept_dad),
      address_eui64: list(v6.address_eui64),
      // A 1.5-only leaf the device lacks is never read or sent.
      address_interface_identifier: macsecSupports(caps, "ipv6_address_interface_identifier")
        ? text(v6.address_interface_identifier)
        : "",
      adjust_mss: text(v6.adjust_mss),
      base_reachable_time: text(v6.base_reachable_time),
      dup_addr_detect_transmits: text(v6.dup_addr_detect_transmits),
      source_validation: text(v6.source_validation),
    },
    dhcpOptions: {
      ...d.dhcp_options,
      client_id: text(d.dhcp_options.client_id),
      default_route_distance: text(d.dhcp_options.default_route_distance),
      host_name: text(d.dhcp_options.host_name),
      reject: list(d.dhcp_options.reject),
      user_class: text(d.dhcp_options.user_class),
      vendor_class_id: text(d.dhcp_options.vendor_class_id),
    },
    dhcpv6Options: {
      duid: text(o6.duid),
      no_release: o6.no_release,
      no_request_dns: macsecSupports(caps, "dhcpv6_options_no_request_dns") && o6.no_request_dns,
      no_request_domain_name:
        macsecSupports(caps, "dhcpv6_options_no_request_domain_name") && o6.no_request_domain_name,
      parameters_only: o6.parameters_only,
      rapid_commit: o6.rapid_commit,
      temporary: o6.temporary,
    },
    pd,
    mirrorIngress: text(d.mirror_ingress),
    mirrorEgress: text(d.mirror_egress),
    redirect: text(d.redirect),
  };
}

function normalizedOriginal(original: MacsecInterface | null, caps: Caps): Norm {
  if (!original) {
    const blank = macsecDraft(null, caps);
    return normalize({ ...blank, cipher: "", encrypt: false }, caps);
  }
  return normalize(macsecDraft(original, caps), caps);
}

// ============================================================================
// Emit helpers
// ============================================================================

const join = (...parts: string[]): string => parts.join(":");

/** One op; `parts` become the colon-joined value (none for a bare op). */
function op(name: string, ...parts: string[]): MacsecBatchOperation {
  return parts.length ? { op: name, value: join(...parts) } : { op: name };
}

/** Single-value leaf: set when changed, delete when cleared. */
function leaf(ops: MacsecBatchOperation[], setOp: string, deleteOp: string, prefix: string[], before: string, after: string): void {
  if (before === after) return;
  ops.push(after ? op(setOp, ...prefix, after) : op(deleteOp, ...prefix));
}

/** A leaf the lab requires: a change is a set; it is never deleted alone. */
function required(ops: MacsecBatchOperation[], setOp: string, before: string, after: string): void {
  if (after && after !== before) ops.push(op(setOp, after));
}

/** Valueless leaf: set when turned on, delete when turned off. */
function flag(ops: MacsecBatchOperation[], setOp: string, deleteOp: string, prefix: string[], before: boolean, after: boolean): void {
  if (before !== after) ops.push(op(after ? setOp : deleteOp, ...prefix));
}

/** Secret leaf: the mask is the stored key (no op); new text is set; cleared is deleted. */
function secret(ops: MacsecBatchOperation[], setOp: string, deleteOp: string | null, prefix: string[], before: string, after: string): void {
  if (after === MASKED_SECRET || before === after) return;
  if (after) ops.push(op(setOp, ...prefix, after));
  else if (deleteOp) ops.push(op(deleteOp, ...prefix));
}

/** `multi:` leaf diffed by value: removed values deleted, added ones set. */
function multi(ops: MacsecBatchOperation[], setOp: string, deleteOp: string, before: string[], after: string[]): void {
  for (const v of before) if (!after.includes(v)) ops.push(op(deleteOp, v));
  for (const v of after) if (!before.includes(v)) ops.push(op(setOp, v));
}

/** `adjust-mss`: a number or the clamp keyword, which has its own op. */
function adjustMss(ops: MacsecBatchOperation[], family: "ip" | "ipv6", before: string, after: string): void {
  if (before === after) return;
  if (!after) ops.push(op(`delete_${family}_adjust_mss`));
  else if (after === CLAMP_MSS_TO_PMTU) ops.push(op(`set_${family}_adjust_mss_clamp_to_pmtu`));
  else ops.push(op(`set_${family}_adjust_mss`, after));
}

/** A section's leaf ops, or its one delete when the edit leaves it without a leaf. */
function section(ops: MacsecBatchOperation[], leafOps: MacsecBatchOperation[], deleteOp: string, beforeEmpty: boolean, afterEmpty: boolean): void {
  if (afterEmpty && !beforeEmpty) ops.push(op(deleteOp));
  else ops.push(...leafOps);
}

function ipEmpty(ip: MacsecIpDraft): boolean {
  return (
    !ip.adjust_mss && !ip.arp_cache_timeout && !ip.source_validation && !ip.disable_arp_filter &&
    !ip.disable_forwarding && !ip.enable_arp_accept && !ip.enable_arp_announce && !ip.enable_arp_ignore &&
    !ip.enable_directed_broadcast && !ip.enable_proxy_arp && !ip.proxy_arp_pvlan
  );
}

function ipv6Empty(v6: MacsecIpv6Draft): boolean {
  return (
    !v6.accept_dad && !v6.address_autoconf && v6.address_eui64.length === 0 && !v6.address_no_default_link_local &&
    !v6.address_interface_identifier && !v6.adjust_mss && !v6.base_reachable_time && !v6.disable_forwarding &&
    !v6.dup_addr_detect_transmits && !v6.source_validation
  );
}

function dhcpEmpty(o: MacsecDhcpDraft): boolean {
  return (
    !o.client_id && !o.default_route_distance && !o.host_name && !o.mtu && !o.no_default_route &&
    o.reject.length === 0 && !o.user_class && !o.vendor_class_id
  );
}

function dhcpv6Empty(o: Norm["dhcpv6Options"], pd: Norm["pd"]): boolean {
  return (
    !o.duid && !o.no_release && !o.no_request_dns && !o.no_request_domain_name && !o.parameters_only &&
    !o.rapid_commit && !o.temporary && pd.size === 0
  );
}

function ipOps(before: MacsecIpDraft, after: MacsecIpDraft): MacsecBatchOperation[] {
  const ops: MacsecBatchOperation[] = [];
  adjustMss(ops, "ip", before.adjust_mss, after.adjust_mss);
  leaf(ops, "set_ip_arp_cache_timeout", "delete_ip_arp_cache_timeout", [], before.arp_cache_timeout, after.arp_cache_timeout);
  flag(ops, "set_ip_disable_arp_filter", "delete_ip_disable_arp_filter", [], before.disable_arp_filter, after.disable_arp_filter);
  flag(ops, "set_ip_disable_forwarding", "delete_ip_disable_forwarding", [], before.disable_forwarding, after.disable_forwarding);
  flag(ops, "set_ip_enable_arp_accept", "delete_ip_enable_arp_accept", [], before.enable_arp_accept, after.enable_arp_accept);
  flag(ops, "set_ip_enable_arp_announce", "delete_ip_enable_arp_announce", [], before.enable_arp_announce, after.enable_arp_announce);
  flag(ops, "set_ip_enable_arp_ignore", "delete_ip_enable_arp_ignore", [], before.enable_arp_ignore, after.enable_arp_ignore);
  flag(ops, "set_ip_enable_directed_broadcast", "delete_ip_enable_directed_broadcast", [], before.enable_directed_broadcast, after.enable_directed_broadcast);
  flag(ops, "set_ip_enable_proxy_arp", "delete_ip_enable_proxy_arp", [], before.enable_proxy_arp, after.enable_proxy_arp);
  flag(ops, "set_ip_proxy_arp_pvlan", "delete_ip_proxy_arp_pvlan", [], before.proxy_arp_pvlan, after.proxy_arp_pvlan);
  leaf(ops, "set_ip_source_validation", "delete_ip_source_validation", [], before.source_validation, after.source_validation);
  return ops;
}

function ipv6Ops(before: MacsecIpv6Draft, after: MacsecIpv6Draft): MacsecBatchOperation[] {
  const ops: MacsecBatchOperation[] = [];
  leaf(ops, "set_ipv6_accept_dad", "delete_ipv6_accept_dad", [], before.accept_dad, after.accept_dad);
  flag(ops, "set_ipv6_address_autoconf", "delete_ipv6_address_autoconf", [], before.address_autoconf, after.address_autoconf);
  multi(ops, "set_ipv6_address_eui64", "delete_ipv6_address_eui64", before.address_eui64, after.address_eui64);
  flag(ops, "set_ipv6_address_no_default_link_local", "delete_ipv6_address_no_default_link_local", [],
    before.address_no_default_link_local, after.address_no_default_link_local);
  leaf(ops, "set_ipv6_address_interface_identifier", "delete_ipv6_address_interface_identifier", [],
    before.address_interface_identifier, after.address_interface_identifier);
  adjustMss(ops, "ipv6", before.adjust_mss, after.adjust_mss);
  leaf(ops, "set_ipv6_base_reachable_time", "delete_ipv6_base_reachable_time", [], before.base_reachable_time, after.base_reachable_time);
  flag(ops, "set_ipv6_disable_forwarding", "delete_ipv6_disable_forwarding", [], before.disable_forwarding, after.disable_forwarding);
  leaf(ops, "set_ipv6_dup_addr_detect_transmits", "delete_ipv6_dup_addr_detect_transmits", [],
    before.dup_addr_detect_transmits, after.dup_addr_detect_transmits);
  leaf(ops, "set_ipv6_source_validation", "delete_ipv6_source_validation", [], before.source_validation, after.source_validation);
  return ops;
}

function dhcpOps(before: MacsecDhcpDraft, after: MacsecDhcpDraft): MacsecBatchOperation[] {
  const ops: MacsecBatchOperation[] = [];
  leaf(ops, "set_dhcp_options_client_id", "delete_dhcp_options_client_id", [], before.client_id, after.client_id);
  leaf(ops, "set_dhcp_options_default_route_distance", "delete_dhcp_options_default_route_distance", [],
    before.default_route_distance, after.default_route_distance);
  leaf(ops, "set_dhcp_options_host_name", "delete_dhcp_options_host_name", [], before.host_name, after.host_name);
  flag(ops, "set_dhcp_options_mtu", "delete_dhcp_options_mtu", [], before.mtu, after.mtu);
  flag(ops, "set_dhcp_options_no_default_route", "delete_dhcp_options_no_default_route", [], before.no_default_route, after.no_default_route);
  multi(ops, "set_dhcp_options_reject", "delete_dhcp_options_reject", before.reject, after.reject);
  leaf(ops, "set_dhcp_options_user_class", "delete_dhcp_options_user_class", [], before.user_class, after.user_class);
  leaf(ops, "set_dhcp_options_vendor_class_id", "delete_dhcp_options_vendor_class_id", [], before.vendor_class_id, after.vendor_class_id);
  return ops;
}

function pdInterfaceLeaves(ops: MacsecBatchOperation[], id: string, name: string, before: { address: string; sla_id: string }, after: { address: string; sla_id: string }): void {
  leaf(ops, "set_dhcpv6_options_pd_interface_address", "delete_dhcpv6_options_pd_interface_address", [id, name], before.address, after.address);
  leaf(ops, "set_dhcpv6_options_pd_interface_sla_id", "delete_dhcpv6_options_pd_interface_sla_id", [id, name], before.sla_id, after.sla_id);
}

const NO_PD_INTERFACE = { address: "", sla_id: "" };

function pdOps(ops: MacsecBatchOperation[], before: Norm["pd"], after: Norm["pd"]): void {
  for (const id of before.keys()) {
    if (!after.has(id)) ops.push(op("delete_dhcpv6_options_pd", id));
  }
  for (const [id, now] of after) {
    const was = before.get(id);
    if (!was) ops.push(op("set_dhcpv6_options_pd", id));
    leaf(ops, "set_dhcpv6_options_pd_length", "delete_dhcpv6_options_pd_length", [id], was?.length ?? "", now.length);
    const wasIfaces = was?.interfaces ?? new Map<string, { address: string; sla_id: string }>();
    for (const name of wasIfaces.keys()) {
      if (!now.interfaces.has(name)) ops.push(op("delete_dhcpv6_options_pd_interface", id, name));
    }
    for (const [name, iface] of now.interfaces) {
      const wasIface = wasIfaces.get(name);
      if (!wasIface) ops.push(op("set_dhcpv6_options_pd_interface", id, name));
      pdInterfaceLeaves(ops, id, name, wasIface ?? NO_PD_INTERFACE, iface);
    }
  }
}

function dhcpv6Ops(before: Norm, after: Norm): MacsecBatchOperation[] {
  const ops: MacsecBatchOperation[] = [];
  const b = before.dhcpv6Options;
  const a = after.dhcpv6Options;
  leaf(ops, "set_dhcpv6_options_duid", "delete_dhcpv6_options_duid", [], b.duid, a.duid);
  flag(ops, "set_dhcpv6_options_no_release", "delete_dhcpv6_options_no_release", [], b.no_release, a.no_release);
  flag(ops, "set_dhcpv6_options_no_request_dns", "delete_dhcpv6_options_no_request_dns", [], b.no_request_dns, a.no_request_dns);
  flag(ops, "set_dhcpv6_options_no_request_domain_name", "delete_dhcpv6_options_no_request_domain_name", [],
    b.no_request_domain_name, a.no_request_domain_name);
  flag(ops, "set_dhcpv6_options_parameters_only", "delete_dhcpv6_options_parameters_only", [], b.parameters_only, a.parameters_only);
  flag(ops, "set_dhcpv6_options_rapid_commit", "delete_dhcpv6_options_rapid_commit", [], b.rapid_commit, a.rapid_commit);
  flag(ops, "set_dhcpv6_options_temporary", "delete_dhcpv6_options_temporary", [], b.temporary, a.temporary);
  pdOps(ops, before.pd, after.pd);
  return ops;
}

function peerOps(ops: MacsecBatchOperation[], before: Norm["peers"], after: Norm["peers"]): void {
  for (const name of before.keys()) {
    if (!after.has(name)) ops.push(op("delete_security_static_peer", name));
  }
  for (const [name, now] of after) {
    const was = before.get(name);
    if (!was) ops.push(op("set_security_static_peer", name));
    secret(ops, "set_security_static_peer_key", "delete_security_static_peer_key", [name], was?.key ?? "", now.key);
    leaf(ops, "set_security_static_peer_mac", "delete_security_static_peer_mac", [name], was?.mac ?? "", now.mac);
    flag(ops, "set_security_static_peer_disable", "delete_security_static_peer_disable", [name], was?.disable ?? false, now.disable);
  }
}

function securityOps(ops: MacsecBatchOperation[], original: MacsecInterface | null, before: Norm, after: Norm): void {
  required(ops, "set_security_cipher", before.cipher, after.cipher);
  flag(ops, "set_security_encrypt", "delete_security_encrypt", [], before.encrypt, after.encrypt);
  leaf(ops, "set_security_replay_window", "delete_security_replay_window", [], before.replay, after.replay);
  // Switching mode drops the old mode's whole node in the same commit.
  // The other mode's node is dropped in the same commit, before the new sets,
  // whenever the device has it (a device may hold both).
  if (after.mode === "static" && original?.security?.mka) ops.push(op("delete_security_mka"));
  if (after.mode === "mka" && original?.security?.static) ops.push(op("delete_security_static"));
  // The new mode diffs against its own loaded node (blank when it is absent).
  if (after.mode === "mka") {
    secret(ops, "set_security_mka_cak", "delete_security_mka_cak", [], before.cak, after.cak);
    leaf(ops, "set_security_mka_ckn", "delete_security_mka_ckn", [], before.ckn, after.ckn);
    leaf(ops, "set_security_mka_priority", "delete_security_mka_priority", [], before.priority, after.priority);
  } else {
    // The static key is required while `static` exists: never deleted alone.
    secret(ops, "set_security_static_key", null, [], before.staticKey, after.staticKey);
    peerOps(ops, before.peers, after.peers);
  }
}

/**
 * Ops that turn the loaded interface (null for a create) into the draft. Run
 * `macsecSaveProblem` first: the emit assumes the draft passed it.
 */
export function macsecSaveOps(original: MacsecInterface | null, draft: MacsecDraft, caps: Caps): MacsecBatchOperation[] {
  const before = normalizedOriginal(original, caps);
  const after = normalize(draft, caps);
  const ops: MacsecBatchOperation[] = [];

  required(ops, "set_source_interface", before.source, after.source);
  leaf(ops, "set_interface_description", "delete_interface_description", [], before.description, after.description);
  leaf(ops, "set_mtu", "delete_mtu", [], before.mtu, after.mtu);
  leaf(ops, "set_vrf", "delete_vrf", [], before.vrf, after.vrf);
  flag(ops, "set_interface_disable", "delete_interface_disable", [], before.disabled, after.disabled);
  multi(ops, "set_interface_address", "delete_interface_address", before.addresses, after.addresses);

  securityOps(ops, original, before, after);

  section(ops, ipOps(before.ip, after.ip), "delete_ip_settings", ipEmpty(before.ip), ipEmpty(after.ip));
  section(ops, ipv6Ops(before.ipv6, after.ipv6), "delete_ipv6_settings", ipv6Empty(before.ipv6), ipv6Empty(after.ipv6));

  // DHCP options are edited only while the dhcp address is on. Turning the
  // address off clears the section; options kept with the address off stay.
  if (after.dhcp) {
    section(ops, dhcpOps(before.dhcpOptions, after.dhcpOptions), "delete_dhcp_options",
      dhcpEmpty(before.dhcpOptions), dhcpEmpty(after.dhcpOptions));
  } else if (before.dhcp && original?.dhcp_options) {
    ops.push(op("delete_dhcp_options"));
  }
  if (after.dhcpv6) {
    section(ops, dhcpv6Ops(before, after), "delete_dhcpv6_options",
      dhcpv6Empty(before.dhcpv6Options, before.pd), dhcpv6Empty(after.dhcpv6Options, after.pd));
  } else if (before.dhcpv6 && original?.dhcpv6_options) {
    ops.push(op("delete_dhcpv6_options"));
  }

  // A bare `mirror {}` (left by deleting both leaves) still blocks redirect, so
  // a draft without a mirror leaf deletes the node whenever the device has it.
  if (!after.mirrorIngress && !after.mirrorEgress && original?.mirror_configured) {
    ops.push(op("delete_mirror"));
  } else {
    leaf(ops, "set_mirror_ingress", "delete_mirror_ingress", [], before.mirrorIngress, after.mirrorIngress);
    leaf(ops, "set_mirror_egress", "delete_mirror_egress", [], before.mirrorEgress, after.mirrorEgress);
  }
  leaf(ops, "set_redirect", "delete_redirect", [], before.redirect, after.redirect);

  return ops;
}

export function macsecDeleteOps(): MacsecBatchOperation[] {
  return [op("delete_interface")];
}

// ============================================================================
// Save checks
// ============================================================================

export type MacsecProblemKey =
  | "nameRequired"
  | "nameFormat"
  | "nameExists"
  | "sourceRequired"
  | "descriptionTooLong"
  | "mtuRange"
  | "addressInvalid"
  | "cipherRequired"
  | "replayWindowRange"
  | "cakRequired"
  | "cakInvalid"
  | "cakLength"
  | "cakMask"
  | "cknRequired"
  | "cknInvalid"
  | "mkaPriorityRange"
  | "staticKeyRequired"
  | "staticKeyInvalid"
  | "staticKeyLength"
  | "staticKeyMask"
  | "peerRequired"
  | "peerNameRequired"
  | "peerNameInvalid"
  | "peerNameDuplicate"
  | "peerKeyRequired"
  | "peerKeyInvalid"
  | "peerKeyLength"
  | "peerKeyMask"
  | "peerMacRequired"
  | "peerMacInvalid"
  | "ipAdjustMssRange"
  | "arpCacheTimeoutRange"
  | "ipv6AdjustMssRange"
  | "baseReachableTimeRange"
  | "dadTransmitsRange"
  | "eui64Invalid"
  | "interfaceIdentifierInvalid"
  | "dhcpClientIdInvalid"
  | "dhcpHostNameInvalid"
  | "dhcpUserClassInvalid"
  | "dhcpVendorClassIdInvalid"
  | "defaultRouteDistanceRange"
  | "dhcpRejectInvalid"
  | "duidInvalid"
  | "pdIdRequired"
  | "pdIdRange"
  | "pdIdDuplicate"
  | "pdLengthRange"
  | "pdInterfaceRequired"
  | "pdInterfaceDuplicate"
  | "pdAddressRange"
  | "pdSlaIdRange"
  | "mirrorRedirect";

export interface MacsecProblem {
  key: MacsecProblemKey;
  values?: Record<string, string | number>;
}

function problem(key: MacsecProblemKey, values?: Record<string, string | number>): MacsecProblem {
  return values ? { key, values } : { key };
}

/** Digits only (no `1.5`, `1e1`), inside the range. */
export function inRange(value: string, range: NumericRange): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && (range.max === undefined || n <= range.max);
}

function bounds(range: NumericRange): Record<string, number> {
  return range.max === undefined ? { min: range.min } : { min: range.min, max: range.max };
}

/** An optional numeric leaf: blank passes, anything else must be in range. */
function rangeProblem(value: string, range: NumericRange, key: MacsecProblemKey, extra: Record<string, string> = {}): MacsecProblem | null {
  return value && !inRange(value, range) ? problem(key, { ...extra, ...bounds(range) }) : null;
}

function adjustMssProblem(value: string, key: MacsecProblemKey): MacsecProblem | null {
  if (value === CLAMP_MSS_TO_PMTU) return null;
  return rangeProblem(value, ADJUST_MSS_RANGE, key);
}

function isAddress(value: string): boolean {
  if (!CIDR_LENGTH_RE.test(value)) return false;
  return value.includes(":") ? isValidIPv6CIDR(value) : isValidIPv4CIDR(value);
}

function dhcpTextValid(value: string): boolean {
  return DHCP_TEXT_RE.test(value) || HEX_COLON_RE.test(value);
}

/** A typed key: hex of 32 or 64 digits, matching the cipher while encrypt is on. */
function keyProblem(
  value: string,
  encrypt: boolean,
  cipher: string,
  invalid: MacsecProblemKey,
  length: MacsecProblemKey,
  extra: Record<string, string> = {},
): MacsecProblem | null {
  if (!SECRET_RE.test(value)) return problem(invalid, extra);
  const need = macsecKeyHexLength(cipher);
  if (encrypt && need && value.length !== need) return problem(length, { ...extra, length: need });
  return null;
}

function first(...checks: (MacsecProblem | null)[]): MacsecProblem | null {
  return checks.find((c) => c !== null) ?? null;
}

/**
 * With encrypt on the device checks every key length against the cipher, but
 * a masked key cannot be checked here. A save that turns encrypt on or changes
 * the cipher while encrypt is on needs every key typed again.
 */
function rekeyed(before: Norm, after: Norm): boolean {
  return after.encrypt && (after.cipher !== before.cipher || !before.encrypt);
}

function mkaProblem(before: Norm, after: Norm): MacsecProblem | null {
  if (after.cak === MASKED_SECRET && (before.cak !== MASKED_SECRET || rekeyed(before, after))) return problem("cakMask");
  if (after.encrypt && !after.cak) return problem("cakRequired");
  if (after.encrypt && !after.ckn) return problem("cknRequired");
  if (after.cak && after.cak !== MASKED_SECRET) {
    const issue = keyProblem(after.cak, after.encrypt, after.cipher, "cakInvalid", "cakLength");
    if (issue) return issue;
  }
  if (after.ckn && !CKN_RE.test(after.ckn)) return problem("cknInvalid");
  return rangeProblem(after.priority, MKA_PRIORITY_RANGE, "mkaPriorityRange");
}

function staticProblem(before: Norm, draft: MacsecDraft, after: Norm): MacsecProblem | null {
  const rekey = rekeyed(before, after);
  if (after.staticKey === MASKED_SECRET && (before.staticKey !== MASKED_SECRET || rekey)) return problem("staticKeyMask");
  if (!after.staticKey) return problem("staticKeyRequired");
  if (after.staticKey !== MASKED_SECRET) {
    const issue = keyProblem(after.staticKey, after.encrypt, after.cipher, "staticKeyInvalid", "staticKeyLength");
    if (issue) return issue;
  }
  const rows = peerRows(draft.peers);
  if (rows.length === 0) return problem("peerRequired");
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.name) return problem("peerNameRequired", { n: row.index + 1 });
    if (!PEER_NAME_RE.test(row.name)) return problem("peerNameInvalid", { name: row.name, max: PEER_NAME_MAX });
    if (seen.has(row.name)) return problem("peerNameDuplicate", { name: row.name });
    seen.add(row.name);
    const storedPeerKey = before.peers.get(row.name)?.key ?? "";
    // The mask stands for the stored key of this peer only; a renamed or new peer needs a typed key.
    if (row.key === MASKED_SECRET && (storedPeerKey !== MASKED_SECRET || rekey)) return problem("peerKeyMask", { name: row.name });
    if (!row.key && (after.encrypt || !row.disable)) return problem("peerKeyRequired", { name: row.name });
    if (row.key && row.key !== MASKED_SECRET) {
      const issue = keyProblem(row.key, after.encrypt, after.cipher, "peerKeyInvalid", "peerKeyLength", { name: row.name });
      if (issue) return issue;
    }
    if (!row.mac && !row.disable) return problem("peerMacRequired", { name: row.name });
    if (row.mac && !MAC_RE.test(row.mac)) return problem("peerMacInvalid", { name: row.name });
  }
  return null;
}

function ipv6Problem(v6: MacsecIpv6Draft): MacsecProblem | null {
  for (const prefix of v6.address_eui64) {
    if (!isValidIPv6CIDR(prefix) || !prefix.endsWith("/64")) return problem("eui64Invalid", { value: prefix });
  }
  if (v6.address_interface_identifier && !INTERFACE_IDENTIFIER_RE.test(v6.address_interface_identifier)) {
    return problem("interfaceIdentifierInvalid");
  }
  return first(
    adjustMssProblem(v6.adjust_mss, "ipv6AdjustMssRange"),
    rangeProblem(v6.base_reachable_time, BASE_REACHABLE_TIME_RANGE, "baseReachableTimeRange"),
    rangeProblem(v6.dup_addr_detect_transmits, DAD_TRANSMITS_RANGE, "dadTransmitsRange"),
  );
}

function dhcpProblem(o: MacsecDhcpDraft): MacsecProblem | null {
  if (o.client_id && !dhcpTextValid(o.client_id)) return problem("dhcpClientIdInvalid");
  if (o.host_name && !HOST_NAME_RE.test(o.host_name)) return problem("dhcpHostNameInvalid");
  if (o.user_class && !dhcpTextValid(o.user_class)) return problem("dhcpUserClassInvalid");
  if (o.vendor_class_id && !dhcpTextValid(o.vendor_class_id)) return problem("dhcpVendorClassIdInvalid");
  for (const value of o.reject) {
    if (!isValidIPv4(value) && !isIPv4Prefix(value)) return problem("dhcpRejectInvalid", { value });
  }
  return rangeProblem(o.default_route_distance, DEFAULT_ROUTE_DISTANCE_RANGE, "defaultRouteDistanceRange");
}

function dhcpv6Problem(draft: MacsecDraft, after: Norm): MacsecProblem | null {
  if (after.dhcpv6Options.duid && !DUID_RE.test(after.dhcpv6Options.duid)) return problem("duidInvalid");
  const ids = new Set<string>();
  for (const row of pdRows(draft.dhcpv6_options.pd)) {
    if (!row.id) return problem("pdIdRequired", { n: row.index + 1 });
    if (!inRange(row.id, PD_ID_RANGE)) return problem("pdIdRange", { id: row.id, ...bounds(PD_ID_RANGE) });
    if (ids.has(row.id)) return problem("pdIdDuplicate", { id: row.id });
    ids.add(row.id);
    const lengthIssue = rangeProblem(row.length, PD_LENGTH_RANGE, "pdLengthRange", { id: row.id });
    if (lengthIssue) return lengthIssue;
    const names = new Set<string>();
    for (const iface of row.interfaces) {
      if (!iface.name) return problem("pdInterfaceRequired", { id: row.id });
      if (names.has(iface.name)) return problem("pdInterfaceDuplicate", { id: row.id, name: iface.name });
      names.add(iface.name);
      const issue = first(
        rangeProblem(iface.address, PD_ADDRESS_RANGE, "pdAddressRange", { id: row.id, name: iface.name }),
        rangeProblem(iface.sla_id, PD_SLA_ID_RANGE, "pdSlaIdRange", { id: row.id, name: iface.name }),
      );
      if (issue) return issue;
    }
  }
  return null;
}

/**
 * The first reason the lab would reject this save, or null. `existingNames`
 * are the configured interfaces a create may not reuse.
 */
export function macsecSaveProblem(
  original: MacsecInterface | null,
  draft: MacsecDraft,
  caps: Caps,
  existingNames: string[] = [],
): MacsecProblem | null {
  const before = normalizedOriginal(original, caps);
  const after = normalize(draft, caps);

  if (!original) {
    const name = text(draft.name);
    if (!name) return problem("nameRequired");
    if (!INTERFACE_NAME_RE.test(name)) return problem("nameFormat");
    if (existingNames.includes(name)) return problem("nameExists", { name });
  }
  if (!after.source) return problem("sourceRequired");
  if (after.description.length > DESCRIPTION_MAX) return problem("descriptionTooLong", { max: DESCRIPTION_MAX });
  const basic = rangeProblem(after.mtu, MTU_RANGE, "mtuRange");
  if (basic) return basic;
  for (const address of after.addresses) {
    if (address !== "dhcp" && address !== "dhcpv6" && !isAddress(address)) return problem("addressInvalid", { value: address });
  }

  if (!after.cipher) return problem("cipherRequired");
  const replay = rangeProblem(after.replay, REPLAY_WINDOW_RANGE, "replayWindowRange");
  if (replay) return replay;
  const security = after.mode === "mka" ? mkaProblem(before, after) : staticProblem(before, draft, after);
  if (security) return security;

  const ip = first(
    adjustMssProblem(after.ip.adjust_mss, "ipAdjustMssRange"),
    rangeProblem(after.ip.arp_cache_timeout, ARP_CACHE_TIMEOUT_RANGE, "arpCacheTimeoutRange"),
    ipv6Problem(after.ipv6),
  );
  if (ip) return ip;
  if (after.dhcp) {
    const dhcp = dhcpProblem(after.dhcpOptions);
    if (dhcp) return dhcp;
  }
  if (after.dhcpv6) {
    const dhcpv6 = dhcpv6Problem(draft, after);
    if (dhcpv6) return dhcpv6;
  }
  if ((after.mirrorIngress || after.mirrorEgress) && after.redirect) return problem("mirrorRedirect");
  return null;
}
