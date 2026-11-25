/**
 * Batch ops and save checks for the VXLAN interface screen. The create and
 * edit dialogs share one form; a create diffs it against nothing, an edit
 * against the loaded interface. A changed leaf is set, a cleared leaf is
 * deleted, an untouched leaf emits nothing. `multi:` leaves are diffed by
 * value, VLAN-to-VNI mappings by VLAN id. The save check and the emit read
 * every value through the same normalizer.
 *
 * The router binds the interface from the request; an op with several extra
 * parameters takes them `|`-joined in `value` (`vlan|vni`).
 */
import type { VxlanBatchOperation, VxlanCapabilities, VxlanInterface } from "./vxlan";
import { isValidIPv4, isValidIPv4CIDR, isValidIPv6, isValidIPv6CIDR } from "../validators/firewall";

// ============================================================================
// Lab bounds (node.def val_help on 1.4 and 1.5)
// ============================================================================

export interface NumericRange {
  min: number;
  /** Absent when the leaf has no upper bound. */
  max?: number;
}

export const MTU_RANGE = { min: 1200, max: 16000 } satisfies NumericRange;
/** Below this MTU the device rejects the interface unless IPv6 is off on it. */
export const IPV6_MIN_MTU = 1280;
export const PORT_RANGE = { min: 1, max: 65535 } satisfies NumericRange;
/** The UDP port the device uses when `port` is unset. */
export const DEFAULT_PORT = "4789";
export const VNI_RANGE = { min: 0, max: 16777214 } satisfies NumericRange;
export const VLAN_ID_RANGE = { min: 0, max: 4094 } satisfies NumericRange;
export const ARP_CACHE_TIMEOUT_RANGE = { min: 1, max: 86400 } satisfies NumericRange;
export const ADJUST_MSS_RANGE = { min: 536, max: 65535 } satisfies NumericRange;
export const BASE_REACHABLE_TIME_RANGE = { min: 1, max: 86400 } satisfies NumericRange;
export const DAD_TRANSMITS_RANGE: NumericRange = { min: 0 };
export const TOS_RANGE = { min: 0, max: 99 } satisfies NumericRange;
export const TTL_RANGE = { min: 0, max: 255 } satisfies NumericRange;
export const DESCRIPTION_MAX = 255;

/** `ip source-validation` / `ipv6 source-validation` values. */
export const SOURCE_VALIDATION_VALUES = ["strict", "loose", "disable"];
/** `ipv6 accept-dad` values. */
export const ACCEPT_DAD_VALUES = ["0", "1", "2"];
/** `parameters ip df` values. */
export const DF_VALUES = ["set", "unset", "inherit"];
/** The `adjust-mss` keyword beside a number. */
export const CLAMP_MSS_TO_PMTU = "clamp-mss-to-pmtu";
/** The `parameters ipv6 flowlabel` keyword beside a hex value. */
export const FLOWLABEL_INHERIT = "inherit";

const INTERFACE_NAME_RE = /^vxlan[0-9]+$/;
const MAC_RE = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/;
const INTERFACE_IDENTIFIER_RE = /^::[0-9A-Fa-f]{1,4}(:[0-9A-Fa-f]{1,4}){0,3}$/;
const FLOWLABEL_RE = /^(0x)?0?[0-9A-Fa-f]{1,5}$/;
const CIDR_LENGTH_RE = /\/(0|[1-9]\d{0,2})$/;
const ID_RANGE_RE = /^(\d+)-(\d+)$/;

// ============================================================================
// Form (what the dialog edits)
// ============================================================================

export interface VxlanIpForm {
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

export interface VxlanIpv6Form {
  accept_dad: string;
  address_autoconf: boolean;
  address_eui64: string[];
  address_interface_identifier: string;
  address_no_default_link_local: boolean;
  adjust_mss: string;
  base_reachable_time: string;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string;
  source_validation: string;
}

export interface VxlanParametersForm {
  external: boolean;
  nolearning: boolean;
  neighbor_suppress: boolean;
  vni_filter: boolean;
  ip_df: string;
  ip_tos: string;
  ip_ttl: string;
  ipv6_flowlabel: string;
}

export interface VxlanVlanRow {
  vlan_id: string;
  vni: string;
  description: string;
}

export interface VxlanForm {
  name: string;
  vni: string;
  description: string;
  addresses: string[];
  source_address: string;
  source_interface: string;
  group: string;
  remotes: string[];
  port: string;
  mtu: string;
  mac: string;
  vrf: string;
  redirect: string;
  disabled: boolean;
  gpe: boolean;
  parameters: VxlanParametersForm;
  mirror_ingress: string;
  mirror_egress: string;
  ip: VxlanIpForm;
  ipv6: VxlanIpv6Form;
  vlan_to_vni: VxlanVlanRow[];
}

type Caps = VxlanCapabilities | null | undefined;

/** Leaves the screen offers only when the device has them (1.5-only, or GPE that 1.4 verify rejects). */
export type VxlanVersionedFeature = "ipv6_address_interface_identifier" | "vlan_to_vni_description" | "gpe";

export function vxlanSupports(caps: Caps, flag: VxlanVersionedFeature): boolean {
  return caps?.features?.[flag]?.supported === true;
}

/** First `vxlanN` that no configured interface uses. */
export function nextVxlanName(existingNames: string[]): string {
  let n = 0;
  while (existingNames.includes(`vxlan${n}`)) n += 1;
  return `vxlan${n}`;
}

const s = (value: string | null | undefined): string => value ?? "";

/** The dialog's starting form: the loaded interface, or a new one. */
export function vxlanForm(existing: VxlanInterface | null, existingNames: string[] = []): VxlanForm {
  const p = existing?.parameters;
  const ip = existing?.ip;
  const v6 = existing?.ipv6;
  return {
    name: existing ? existing.name : nextVxlanName(existingNames),
    vni: s(existing?.vni),
    description: s(existing?.description),
    addresses: [...(existing?.addresses ?? [])],
    source_address: s(existing?.source_address),
    source_interface: s(existing?.source_interface),
    group: s(existing?.group),
    remotes: [...(existing?.remotes ?? [])],
    port: s(existing?.port),
    mtu: s(existing?.mtu),
    mac: s(existing?.mac),
    vrf: s(existing?.vrf),
    redirect: s(existing?.redirect),
    disabled: existing?.disabled ?? false,
    gpe: existing?.gpe ?? false,
    parameters: {
      external: p?.external ?? false,
      nolearning: p?.nolearning ?? false,
      neighbor_suppress: p?.neighbor_suppress ?? false,
      vni_filter: p?.vni_filter ?? false,
      ip_df: s(p?.ip?.df),
      ip_tos: s(p?.ip?.tos),
      ip_ttl: s(p?.ip?.ttl),
      ipv6_flowlabel: s(p?.ipv6?.flowlabel),
    },
    mirror_ingress: s(existing?.mirror?.ingress),
    mirror_egress: s(existing?.mirror?.egress),
    ip: {
      adjust_mss: s(ip?.adjust_mss),
      arp_cache_timeout: s(ip?.arp_cache_timeout),
      disable_arp_filter: ip?.disable_arp_filter ?? false,
      disable_forwarding: ip?.disable_forwarding ?? false,
      enable_arp_accept: ip?.enable_arp_accept ?? false,
      enable_arp_announce: ip?.enable_arp_announce ?? false,
      enable_arp_ignore: ip?.enable_arp_ignore ?? false,
      enable_directed_broadcast: ip?.enable_directed_broadcast ?? false,
      enable_proxy_arp: ip?.enable_proxy_arp ?? false,
      proxy_arp_pvlan: ip?.proxy_arp_pvlan ?? false,
      source_validation: s(ip?.source_validation),
    },
    ipv6: {
      accept_dad: s(v6?.accept_dad),
      address_autoconf: v6?.address?.autoconf ?? false,
      address_eui64: [...(v6?.address?.eui64 ?? [])],
      address_interface_identifier: s(v6?.address?.interface_identifier),
      address_no_default_link_local: v6?.address?.no_default_link_local ?? false,
      adjust_mss: s(v6?.adjust_mss),
      base_reachable_time: s(v6?.base_reachable_time),
      disable_forwarding: v6?.disable_forwarding ?? false,
      dup_addr_detect_transmits: s(v6?.dup_addr_detect_transmits),
      source_validation: s(v6?.source_validation),
    },
    vlan_to_vni: (existing?.vlan_to_vni ?? []).map((m) => ({
      vlan_id: m.vlan_id,
      vni: s(m.vni),
      description: s(m.description),
    })),
  };
}

// ============================================================================
// Normalizer (read by both the save check and the emit)
// ============================================================================

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

interface VlanRow {
  /** Position of the row in the form (what the screen numbers). */
  index: number;
  vlan: string;
  vni: string;
  description: string;
}

/** Trimmed mapping rows; a row the user added and never filled is dropped. */
function vlanRows(rows: VxlanVlanRow[], caps: Caps): VlanRow[] {
  const described = vxlanSupports(caps, "vlan_to_vni_description");
  return rows
    .map((r, index) => ({
      index,
      vlan: text(r.vlan_id),
      vni: text(r.vni),
      // A 1.5-only leaf the device lacks is never read or sent.
      description: described ? text(r.description) : "",
    }))
    .filter((r) => r.vlan || r.vni || r.description);
}

interface Norm extends Omit<VxlanForm, "vlan_to_vni"> {
  vlans: Map<string, { vni: string; description: string }>;
}

function normalize(f: VxlanForm, caps: Caps): Norm {
  const vlans = new Map<string, { vni: string; description: string }>();
  for (const row of vlanRows(f.vlan_to_vni, caps)) {
    if (row.vlan && !vlans.has(row.vlan)) vlans.set(row.vlan, { vni: row.vni, description: row.description });
  }
  const p = f.parameters;
  const v6 = f.ipv6;
  return {
    name: text(f.name),
    vni: text(f.vni),
    description: text(f.description),
    addresses: list(f.addresses),
    source_address: text(f.source_address),
    source_interface: text(f.source_interface),
    group: text(f.group),
    remotes: list(f.remotes),
    port: text(f.port),
    mtu: text(f.mtu),
    mac: text(f.mac),
    vrf: text(f.vrf),
    redirect: text(f.redirect),
    disabled: f.disabled,
    // A leaf the device rejects (gpe on 1.4) is never read or sent.
    gpe: vxlanSupports(caps, "gpe") ? f.gpe : false,
    parameters: {
      ...p,
      ip_df: text(p.ip_df),
      ip_tos: text(p.ip_tos),
      ip_ttl: text(p.ip_ttl),
      ipv6_flowlabel: text(p.ipv6_flowlabel),
    },
    mirror_ingress: text(f.mirror_ingress),
    mirror_egress: text(f.mirror_egress),
    ip: {
      ...f.ip,
      adjust_mss: text(f.ip.adjust_mss),
      arp_cache_timeout: text(f.ip.arp_cache_timeout),
      source_validation: text(f.ip.source_validation),
    },
    ipv6: {
      ...v6,
      accept_dad: text(v6.accept_dad),
      address_eui64: list(v6.address_eui64),
      // A 1.5-only leaf the device lacks is never read or sent.
      address_interface_identifier: vxlanSupports(caps, "ipv6_address_interface_identifier")
        ? text(v6.address_interface_identifier)
        : "",
      adjust_mss: text(v6.adjust_mss),
      base_reachable_time: text(v6.base_reachable_time),
      dup_addr_detect_transmits: text(v6.dup_addr_detect_transmits),
      source_validation: text(v6.source_validation),
    },
    vlans,
  };
}

// ============================================================================
// Emit helpers
// ============================================================================

/** One op; `parts` become the `|`-joined value (none for a name-only op). */
function op(name: string, ...parts: string[]): VxlanBatchOperation {
  return parts.length ? { op: name, value: parts.join("|") } : { op: name };
}

/** Single-value leaf: set when changed, delete when cleared. */
function leaf(ops: VxlanBatchOperation[], setOp: string, deleteOp: string, before: string, after: string): void {
  if (before === after) return;
  ops.push(after ? op(setOp, after) : op(deleteOp));
}

/** Valueless leaf: set when turned on, delete when turned off. */
function flag(ops: VxlanBatchOperation[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before !== after) ops.push(op(after ? setOp : deleteOp));
}

/**
 * `multi:` leaf diffed by value: removed values deleted, added ones set. A
 * list the edit empties is cleared with its one bulk delete.
 */
function multi(
  ops: VxlanBatchOperation[],
  setOp: string,
  deleteOp: string,
  deleteAllOp: string,
  before: string[],
  after: string[],
): void {
  if (after.length === 0 && before.length > 0) {
    ops.push(op(deleteAllOp));
    return;
  }
  for (const v of before) if (!after.includes(v)) ops.push(op(deleteOp, v));
  for (const v of after) if (!before.includes(v)) ops.push(op(setOp, v));
}

function ipOps(ops: VxlanBatchOperation[], b: VxlanIpForm, a: VxlanIpForm): void {
  leaf(ops, "set_ip_adjust_mss", "delete_ip_adjust_mss", b.adjust_mss, a.adjust_mss);
  leaf(ops, "set_ip_arp_cache_timeout", "delete_ip_arp_cache_timeout", b.arp_cache_timeout, a.arp_cache_timeout);
  flag(ops, "set_ip_disable_arp_filter", "delete_ip_disable_arp_filter", b.disable_arp_filter, a.disable_arp_filter);
  flag(ops, "set_ip_disable_forwarding", "delete_ip_disable_forwarding", b.disable_forwarding, a.disable_forwarding);
  flag(ops, "set_ip_enable_arp_accept", "delete_ip_enable_arp_accept", b.enable_arp_accept, a.enable_arp_accept);
  flag(ops, "set_ip_enable_arp_announce", "delete_ip_enable_arp_announce", b.enable_arp_announce, a.enable_arp_announce);
  flag(ops, "set_ip_enable_arp_ignore", "delete_ip_enable_arp_ignore", b.enable_arp_ignore, a.enable_arp_ignore);
  flag(ops, "set_ip_enable_directed_broadcast", "delete_ip_enable_directed_broadcast",
    b.enable_directed_broadcast, a.enable_directed_broadcast);
  flag(ops, "set_ip_enable_proxy_arp", "delete_ip_enable_proxy_arp", b.enable_proxy_arp, a.enable_proxy_arp);
  flag(ops, "set_ip_proxy_arp_pvlan", "delete_ip_proxy_arp_pvlan", b.proxy_arp_pvlan, a.proxy_arp_pvlan);
  leaf(ops, "set_ip_source_validation", "delete_ip_source_validation", b.source_validation, a.source_validation);
}

function ipv6Ops(ops: VxlanBatchOperation[], b: VxlanIpv6Form, a: VxlanIpv6Form): void {
  leaf(ops, "set_ipv6_accept_dad", "delete_ipv6_accept_dad", b.accept_dad, a.accept_dad);
  flag(ops, "set_ipv6_address_autoconf", "delete_ipv6_address_autoconf", b.address_autoconf, a.address_autoconf);
  multi(ops, "set_ipv6_address_eui64", "delete_ipv6_address_eui64", "delete_all_ipv6_address_eui64",
    b.address_eui64, a.address_eui64);
  leaf(ops, "set_ipv6_address_interface_identifier", "delete_ipv6_address_interface_identifier",
    b.address_interface_identifier, a.address_interface_identifier);
  flag(ops, "set_ipv6_address_no_default_link_local", "delete_ipv6_address_no_default_link_local",
    b.address_no_default_link_local, a.address_no_default_link_local);
  leaf(ops, "set_ipv6_adjust_mss", "delete_ipv6_adjust_mss", b.adjust_mss, a.adjust_mss);
  leaf(ops, "set_ipv6_base_reachable_time", "delete_ipv6_base_reachable_time", b.base_reachable_time, a.base_reachable_time);
  flag(ops, "set_ipv6_disable_forwarding", "delete_ipv6_disable_forwarding", b.disable_forwarding, a.disable_forwarding);
  leaf(ops, "set_ipv6_dup_addr_detect_transmits", "delete_ipv6_dup_addr_detect_transmits",
    b.dup_addr_detect_transmits, a.dup_addr_detect_transmits);
  leaf(ops, "set_ipv6_source_validation", "delete_ipv6_source_validation", b.source_validation, a.source_validation);
}

function parameterOps(ops: VxlanBatchOperation[], b: VxlanParametersForm, a: VxlanParametersForm): void {
  flag(ops, "set_parameters_external", "delete_parameters_external", b.external, a.external);
  flag(ops, "set_parameters_nolearning", "delete_parameters_nolearning", b.nolearning, a.nolearning);
  flag(ops, "set_parameters_neighbor_suppress", "delete_parameters_neighbor_suppress", b.neighbor_suppress, a.neighbor_suppress);
  flag(ops, "set_parameters_vni_filter", "delete_parameters_vni_filter", b.vni_filter, a.vni_filter);
  leaf(ops, "set_parameters_ip_df", "delete_parameters_ip_df", b.ip_df, a.ip_df);
  leaf(ops, "set_parameters_ip_tos", "delete_parameters_ip_tos", b.ip_tos, a.ip_tos);
  leaf(ops, "set_parameters_ip_ttl", "delete_parameters_ip_ttl", b.ip_ttl, a.ip_ttl);
  leaf(ops, "set_parameters_ipv6_flowlabel", "delete_parameters_ipv6_flowlabel", b.ipv6_flowlabel, a.ipv6_flowlabel);
}

/**
 * Mappings keyed by VLAN id. A removed id is deleted (all of them in one op
 * when none stays and none is added); a new id is created with its VNI (the
 * lab requires one) and description; a kept id only gets its changed leaves.
 * `delete_vlan_to_vni_vni` is never sent: a mapping without a VNI fails commit.
 */
function vlanOps(ops: VxlanBatchOperation[], before: Norm["vlans"], after: Norm["vlans"]): void {
  const removed = [...before.keys()].filter((vlan) => !after.has(vlan));
  const added = [...after.keys()].filter((vlan) => !before.has(vlan));
  if (removed.length > 0 && removed.length === before.size && added.length === 0) {
    ops.push(op("delete_all_vlan_to_vni"));
    return;
  }
  for (const vlan of removed) ops.push(op("delete_vlan_to_vni", vlan));
  for (const [vlan, now] of after) {
    const was = before.get(vlan);
    if (!was) {
      ops.push(op("set_vlan_to_vni", vlan));
      ops.push(op("set_vlan_to_vni_vni", vlan, now.vni));
      if (now.description) ops.push(op("set_vlan_to_vni_description", vlan, now.description));
      continue;
    }
    if (now.vni !== was.vni) ops.push(op("set_vlan_to_vni_vni", vlan, now.vni));
    if (now.description !== was.description) {
      ops.push(now.description
        ? op("set_vlan_to_vni_description", vlan, now.description)
        : op("delete_vlan_to_vni_description", vlan));
    }
  }
}

/** Diff the mirror leaves; `mirrorNode` is true when the device holds a `mirror` node (maybe bare). */
function mirrorOps(ops: VxlanBatchOperation[], before: Norm, after: Norm, mirrorNode: boolean): void {
  const leavesBefore = Boolean(before.mirror_ingress || before.mirror_egress);
  const leavesAfter = Boolean(after.mirror_ingress || after.mirror_egress);
  // Deleting both leaves leaves a bare `mirror {}` that still blocks redirect,
  // so a mirror that ends empty is removed as one node.
  if (mirrorNode && !leavesAfter && (leavesBefore || after.redirect)) {
    ops.push(op("delete_mirror"));
    return;
  }
  leaf(ops, "set_mirror_ingress", "delete_mirror_ingress", before.mirror_ingress, after.mirror_ingress);
  leaf(ops, "set_mirror_egress", "delete_mirror_egress", before.mirror_egress, after.mirror_egress);
}

function diffOps(before: Norm, after: Norm, mirrorNode: boolean): VxlanBatchOperation[] {
  const ops: VxlanBatchOperation[] = [];
  leaf(ops, "set_vni", "delete_vni", before.vni, after.vni);
  leaf(ops, "set_description", "delete_description", before.description, after.description);
  multi(ops, "set_address", "delete_address", "delete_all_addresses", before.addresses, after.addresses);
  leaf(ops, "set_source_address", "delete_source_address", before.source_address, after.source_address);
  leaf(ops, "set_source_interface", "delete_source_interface", before.source_interface, after.source_interface);
  leaf(ops, "set_group", "delete_group", before.group, after.group);
  multi(ops, "set_remote", "delete_remote", "delete_all_remotes", before.remotes, after.remotes);
  leaf(ops, "set_port", "delete_port", before.port, after.port);
  leaf(ops, "set_mtu", "delete_mtu", before.mtu, after.mtu);
  leaf(ops, "set_mac", "delete_mac", before.mac, after.mac);
  leaf(ops, "set_vrf", "delete_vrf", before.vrf, after.vrf);
  flag(ops, "set_disable", "delete_disable", before.disabled, after.disabled);
  flag(ops, "set_gpe", "delete_gpe", before.gpe, after.gpe);
  parameterOps(ops, before.parameters, after.parameters);
  mirrorOps(ops, before, after, mirrorNode);
  leaf(ops, "set_redirect", "delete_redirect", before.redirect, after.redirect);
  ipOps(ops, before.ip, after.ip);
  ipv6Ops(ops, before.ipv6, after.ipv6);
  vlanOps(ops, before.vlans, after.vlans);
  return ops;
}

/** Ops that create the interface from the form. Run `vxlanProblem` first. */
export function vxlanCreateOps(form: VxlanForm, caps: Caps): VxlanBatchOperation[] {
  return [op("set_interface"), ...diffOps(normalize(vxlanForm(null), caps), normalize(form, caps), false)];
}

/** Ops that turn the loaded interface into the form. Run `vxlanProblem` first. */
export function vxlanUpdateOps(original: VxlanInterface, form: VxlanForm, caps: Caps): VxlanBatchOperation[] {
  return diffOps(normalize(vxlanForm(original), caps), normalize(form, caps), original.mirror_configured);
}

export function vxlanDeleteOps(): VxlanBatchOperation[] {
  return [op("delete_interface")];
}

// ============================================================================
// Save checks
// ============================================================================

export type VxlanProblemKey =
  | "nameRequired"
  | "nameFormat"
  | "nameExists"
  | "vniRange"
  | "descriptionTooLong"
  | "addressInvalid"
  | "sourceAddressInvalid"
  | "groupInvalid"
  | "remoteInvalid"
  | "portRange"
  | "mtuRange"
  | "mtuNeedsIpv6Off"
  | "macInvalid"
  | "vniOrExternal"
  | "vniWithExternal"
  | "externalNeedsVniFilter"
  | "externalOthersNeedVniFilter"
  | "vniFilterNeedsExternal"
  | "externalPortInUse"
  | "gpeNeedsExternal"
  | "endpointRequired"
  | "groupNeedsSourceInterface"
  | "groupWithRemote"
  | "addressFamilyMixed"
  | "mirrorWithRedirect"
  | "vlanToVniNeedsBridge"
  | "neighborSuppressNeedsBridge"
  | "bridgeMemberVrf"
  | "bridgeMemberAddress"
  | "tosRange"
  | "ttlRange"
  | "flowlabelInvalid"
  | "ipAdjustMssRange"
  | "arpCacheTimeoutRange"
  | "ipv6AdjustMssRange"
  | "baseReachableTimeRange"
  | "dadTransmitsRange"
  | "eui64Invalid"
  | "interfaceIdentifierInvalid"
  | "vlanIdRequired"
  | "vlanIdInvalid"
  | "vlanIdOverlap"
  | "vlanVniRequired"
  | "vlanVniInvalid"
  | "vlanVniRangeLength"
  | "vniReused"
  | "vlanDescriptionTooLong";

export interface VxlanProblem {
  key: VxlanProblemKey;
  values?: Record<string, string | number>;
}

function problem(key: VxlanProblemKey, values?: Record<string, string | number>): VxlanProblem {
  return values ? { key, values } : { key };
}

/** Digits only (no `1.5`, `1e1`), inside the range. */
function inRange(value: string, range: NumericRange): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && (range.max === undefined || n <= range.max);
}

function bounds(range: NumericRange): Record<string, number> {
  return range.max === undefined ? { min: range.min } : { min: range.min, max: range.max };
}

/** An optional numeric leaf: blank passes, anything else must be in range. */
function rangeProblem(value: string, range: NumericRange, key: VxlanProblemKey): VxlanProblem | null {
  return value && !inRange(value, range) ? problem(key, bounds(range)) : null;
}

function adjustMssProblem(value: string, key: VxlanProblemKey): VxlanProblem | null {
  if (value === CLAMP_MSS_TO_PMTU) return null;
  return rangeProblem(value, ADJUST_MSS_RANGE, key);
}

function first(...checks: (VxlanProblem | null)[]): VxlanProblem | null {
  return checks.find((c) => c !== null) ?? null;
}

/** A single id or an `a-b` range with a <= b, inside the range. */
function idOrRange(value: string, range: NumericRange): [number, number] | null {
  if (inRange(value, range)) return [Number(value), Number(value)];
  const m = ID_RANGE_RE.exec(value);
  if (!m || !inRange(m[1], range) || !inRange(m[2], range)) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return lo <= hi ? [lo, hi] : null;
}

/** Dotted IPv4 to its 32-bit value. */
function ipv4Number(ip: string): number {
  return ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

/**
 * An interface address with prefix length. An IPv4 network address (host
 * bits all zero) is not a host below /31; IPv6 network addresses are left to
 * the device (1.5 accepts them, 1.4 does not).
 */
function isAddress(value: string): boolean {
  if (!CIDR_LENGTH_RE.test(value)) return false;
  if (value.includes(":")) return isValidIPv6CIDR(value);
  if (!isValidIPv4CIDR(value)) return false;
  const [ip, length] = value.split("/");
  const prefix = Number(length);
  if (prefix >= 31) return true;
  const hostBits = 2 ** (32 - prefix);
  return ipv4Number(ip) % hostBits !== 0;
}

function isIp(value: string): boolean {
  return value.includes(":") ? isValidIPv6(value) : isValidIPv4(value);
}

function isMulticast(value: string): boolean {
  if (value.includes(":")) return isValidIPv6(value) && /^ff/i.test(value);
  if (!isValidIPv4(value)) return false;
  const octet = Number(value.split(".")[0]);
  return octet >= 224 && octet <= 239;
}

function flowlabelValid(value: string): boolean {
  return value === FLOWLABEL_INHERIT || FLOWLABEL_RE.test(value);
}

/** First number two inclusive ranges share, or null when they are apart. */
function sharedId(a: [number, number], b: [number, number]): number | null {
  const lo = Math.max(a[0], b[0]);
  return lo <= Math.min(a[1], b[1]) ? lo : null;
}

/**
 * Mapping rows as the lab verifies them: every range expanded, compared as
 * numbers (`010` is `10`). A VLAN id may sit in one row only, and a VNI may
 * be given to one VLAN only.
 */
function vlanProblem(form: VxlanForm, caps: Caps): VxlanProblem | null {
  const usedVlans: [number, number][] = [];
  const usedVnis: [number, number][] = [];
  for (const row of vlanRows(form.vlan_to_vni, caps)) {
    if (!row.vlan) return problem("vlanIdRequired", { n: row.index + 1 });
    const vlans = idOrRange(row.vlan, VLAN_ID_RANGE);
    if (!vlans) return problem("vlanIdInvalid", { vlan: row.vlan, ...bounds(VLAN_ID_RANGE) });
    for (const used of usedVlans) {
      const shared = sharedId(used, vlans);
      if (shared !== null) return problem("vlanIdOverlap", { vlan: String(shared) });
    }
    usedVlans.push(vlans);
    if (!row.vni) return problem("vlanVniRequired", { vlan: row.vlan });
    const vnis = idOrRange(row.vni, VNI_RANGE);
    if (!vnis) return problem("vlanVniInvalid", { vlan: row.vlan, ...bounds(VNI_RANGE) });
    if (vnis[1] - vnis[0] !== vlans[1] - vlans[0]) return problem("vlanVniRangeLength", { vlan: row.vlan });
    for (const used of usedVnis) {
      const shared = sharedId(used, vnis);
      if (shared !== null) return problem("vniReused", { vni: String(shared) });
    }
    usedVnis.push(vnis);
    if (row.description.length > DESCRIPTION_MAX) {
      return problem("vlanDescriptionTooLong", { vlan: row.vlan, max: DESCRIPTION_MAX });
    }
  }
  return null;
}

/** The device state a save is checked against, beyond the interface itself. */
export interface VxlanSaveContext {
  /** The other configured VXLAN interfaces (all of them on create). */
  others?: VxlanInterface[];
  /** True when the interface is a member of a bridge (false on create). */
  bridgeMember?: boolean;
}

/** The verify rules of `interfaces vxlan` (vni vs external, endpoints, families, bridge). */
function verifyProblem(n: Norm, ctx: VxlanSaveContext): VxlanProblem | null {
  const p = n.parameters;
  const others = ctx.others ?? [];
  if (!n.vni && !p.external) return problem("vniOrExternal");
  if (n.vni && p.external) return problem("vniWithExternal");
  if (p.vni_filter && !p.external) return problem("vniFilterNeedsExternal");
  // More than one VXLAN with external needs vni-filter here and on at least one other tunnel.
  if (p.external && others.length > 0) {
    if (!p.vni_filter) return problem("externalNeedsVniFilter");
    if (!others.some((o) => o.parameters.vni_filter)) return problem("externalOthersNeedVniFilter");
  }
  // An external and a non-external tunnel cannot share a UDP port.
  const port = Number(n.port || DEFAULT_PORT);
  const clash = others.find(
    (o) => o.parameters.external !== p.external && Number(o.port?.trim() || DEFAULT_PORT) === port,
  );
  if (clash) return problem("externalPortInUse", { port: String(port), name: clash.name });
  if (n.gpe && !p.external) return problem("gpeNeedsExternal");
  if (!n.group && n.remotes.length === 0 && !n.source_address && !n.source_interface) return problem("endpointRequired");
  if (n.group && !n.source_interface) return problem("groupNeedsSourceInterface");
  if (n.group && n.remotes.length > 0) return problem("groupWithRemote");
  // The underlay is one family: the source address and every remote.
  const families = new Set([n.source_address, ...n.remotes].filter(Boolean).map((a) => a.includes(":")));
  if (families.size > 1) return problem("addressFamilyMixed");
  if ((n.mirror_ingress || n.mirror_egress) && n.redirect) return problem("mirrorWithRedirect");
  if (ctx.bridgeMember) {
    if (n.vrf) return problem("bridgeMemberVrf");
    if (n.addresses.length > 0) return problem("bridgeMemberAddress");
  } else {
    if (n.vlans.size > 0) return problem("vlanToVniNeedsBridge");
    if (p.neighbor_suppress) return problem("neighborSuppressNeedsBridge");
  }
  return null;
}

/**
 * An MTU below the IPv6 minimum is accepted only with IPv6 off: no default
 * link-local, and no IPv6 address, SLAAC, EUI-64 or interface identifier.
 */
function mtuIpv6Problem(n: Norm): VxlanProblem | null {
  if (!n.mtu || Number(n.mtu) >= IPV6_MIN_MTU) return null;
  const v6 = n.ipv6;
  const ipv6On =
    !v6.address_no_default_link_local ||
    n.addresses.some((a) => a.includes(":")) ||
    v6.address_autoconf ||
    v6.address_eui64.length > 0 ||
    Boolean(v6.address_interface_identifier);
  return ipv6On ? problem("mtuNeedsIpv6Off", { min: IPV6_MIN_MTU }) : null;
}

/** The first reason the lab would reject this save, or null. */
export function vxlanProblem(
  original: VxlanInterface | null,
  form: VxlanForm,
  caps: Caps,
  ctx: VxlanSaveContext = {},
): VxlanProblem | null {
  const n = normalize(form, caps);
  if (!original) {
    if (!n.name) return problem("nameRequired");
    if (!INTERFACE_NAME_RE.test(n.name)) return problem("nameFormat");
    if ((ctx.others ?? []).some((o) => o.name === n.name)) return problem("nameExists", { name: n.name });
  }
  const basic = rangeProblem(n.vni, VNI_RANGE, "vniRange");
  if (basic) return basic;
  if (n.description.length > DESCRIPTION_MAX) return problem("descriptionTooLong", { max: DESCRIPTION_MAX });
  for (const value of n.addresses) if (!isAddress(value)) return problem("addressInvalid", { value });
  if (n.source_address && !isIp(n.source_address)) return problem("sourceAddressInvalid", { value: n.source_address });
  if (n.group && !isMulticast(n.group)) return problem("groupInvalid", { value: n.group });
  for (const value of n.remotes) if (!isIp(value)) return problem("remoteInvalid", { value });
  const numbers = first(
    rangeProblem(n.port, PORT_RANGE, "portRange"),
    rangeProblem(n.mtu, MTU_RANGE, "mtuRange"),
  );
  if (numbers) return numbers;
  if (n.mac && !MAC_RE.test(n.mac)) return problem("macInvalid");

  const verify = verifyProblem(n, ctx);
  if (verify) return verify;

  const p = n.parameters;
  const params = first(
    rangeProblem(p.ip_tos, TOS_RANGE, "tosRange"),
    rangeProblem(p.ip_ttl, TTL_RANGE, "ttlRange"),
  );
  if (params) return params;
  if (p.ipv6_flowlabel && !flowlabelValid(p.ipv6_flowlabel)) return problem("flowlabelInvalid");

  const ip = first(
    adjustMssProblem(n.ip.adjust_mss, "ipAdjustMssRange"),
    rangeProblem(n.ip.arp_cache_timeout, ARP_CACHE_TIMEOUT_RANGE, "arpCacheTimeoutRange"),
    adjustMssProblem(n.ipv6.adjust_mss, "ipv6AdjustMssRange"),
    rangeProblem(n.ipv6.base_reachable_time, BASE_REACHABLE_TIME_RANGE, "baseReachableTimeRange"),
    rangeProblem(n.ipv6.dup_addr_detect_transmits, DAD_TRANSMITS_RANGE, "dadTransmitsRange"),
  );
  if (ip) return ip;
  for (const prefix of n.ipv6.address_eui64) {
    if (!isValidIPv6CIDR(prefix) || !prefix.endsWith("/64")) return problem("eui64Invalid", { value: prefix });
  }
  if (n.ipv6.address_interface_identifier && !INTERFACE_IDENTIFIER_RE.test(n.ipv6.address_interface_identifier)) {
    return problem("interfaceIdentifierInvalid");
  }
  const mtu = mtuIpv6Problem(n);
  if (mtu) return mtu;
  return vlanProblem(form, caps);
}
