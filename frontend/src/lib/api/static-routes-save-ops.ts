/**
 * Diff saves for `protocols static`.
 *
 * Every emit and every save check for the static routes screens lives here.
 * A route editor diffs its form against the loaded record, so an untouched
 * leaf is not rewritten, a cleared leaf emits its delete, and a next-hop or
 * interface keeps every child the form does not show. The same route leaves
 * run in three scopes: global, inside a routing table, and under a VRF (the
 * VRF builder runs the global ops under `vrf name <vrf>`).
 *
 * Batch values are the builder method's arguments joined with ",". Only the
 * last argument may hold a comma (description, segments).
 */

import type {
  ArpEntry,
  MulticastRoute,
  StaticRoute,
  StaticRoutesBatchOperation,
} from "./static-routes";

/** Lab `val_help` ranges under `protocols static` (1.4 and 1.5). */
export const DISTANCE_RANGE = { min: 1, max: 255 } as const;
export const TAG_RANGE = { min: 1, max: 4294967295 } as const;
export const TABLE_RANGE = { min: 1, max: 200 } as const;
export const DESCRIPTION_MAX = 255;

export type RouteFamily = "ipv4" | "ipv6";

/** Version-only route leaves this device has (from capabilities). */
export interface StaticRouteFeatures {
  /** SRv6 `segments` on IPv4 next-hops and interfaces (IPv6 has them on both labs). */
  ipv4Segments: boolean;
  /** 1.4 `bfd multi-hop source <addr> profile`. */
  bfdSourceProfile: boolean;
}

/** Where a route lives; picks the op names and the leading arguments. */
export type StaticRouteScope =
  | { kind: "global" }
  | { kind: "table"; tableId: number }
  | { kind: "vrf"; vrf: string };

// ============================================================================
// Normalising and validating values
// ============================================================================

/** Every value as both the save check and the emit read it. */
export function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

const IPV4_OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);
const IPV4_PREFIX = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}/(3[0-2]|[12]?\\d)$`);
const MAC = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

export function isIpv4(value: string): boolean {
  return IPV4.test(value);
}

export function isIpv6(value: string): boolean {
  if (!/^[0-9A-Fa-f:.]+$/.test(value) || !value.includes(":")) return false;
  try {
    return new URL(`http://[${value}]/`).hostname !== "";
  } catch {
    return false;
  }
}

function isIpv6Prefix(value: string): boolean {
  const [address, length, extra] = value.split("/");
  if (extra !== undefined || length === undefined || !/^\d{1,3}$/.test(length)) return false;
  return Number(length) <= 128 && isIpv6(address);
}

export function isAddress(value: string, family: RouteFamily): boolean {
  return family === "ipv4" ? isIpv4(value) : isIpv6(value);
}

export function isPrefix(value: string, family: RouteFamily): boolean {
  return family === "ipv4" ? IPV4_PREFIX.test(value) : isIpv6Prefix(value);
}

function inRange(value: string, range: { min: number; max: number }): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

type RangeField = "distance" | "tag";

const RANGES: Record<RangeField, { min: number; max: number }> = {
  distance: DISTANCE_RANGE,
  tag: TAG_RANGE,
};

function rangeProblem(value: string, field: RangeField, name?: string) {
  if (!value || inRange(value, RANGES[field])) return null;
  return { key: "range" as const, field, ...RANGES[field], name };
}

// ============================================================================
// Leaf ops
// ============================================================================

/** One builder op without its scope: `leaf` is the op suffix ("" for the node). */
export interface LeafOp {
  verb: "set" | "delete";
  leaf: string;
  args: string[];
}

function set(leaf: string, ...args: string[]): LeafOp {
  return { verb: "set", leaf, args };
}

function del(leaf: string, ...args: string[]): LeafOp {
  return { verb: "delete", leaf, args };
}

/** A single-value leaf: a set replaces it, a cleared field deletes it. */
function leaf(ops: LeafOp[], name: string, keys: string[], before: string, after: string): void {
  if (before === after) return;
  ops.push(after ? set(name, ...keys, after) : del(name, ...keys));
}

/** A presence leaf. */
function flag(ops: LeafOp[], name: string, keys: string[], before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push(after ? set(name, ...keys) : del(name, ...keys));
}

/** A multi leaf: delete the removed values, set the added ones. */
function multi(ops: LeafOp[], name: string, keys: string[], before: string[], after: string[]): void {
  for (const value of before) if (!after.includes(value)) ops.push(del(name, ...keys, value));
  for (const value of after) if (!before.includes(value)) ops.push(set(name, ...keys, value));
}

function byName<T>(rows: T[], name: (row: T) => string): Map<string, T> {
  return new Map(rows.map((row) => [name(row), row]));
}

// ============================================================================
// Routes
// ============================================================================

export interface NextHopFields {
  address: string;
  distance: string;
  disable: boolean;
  interface: string;
  vrf: string;
  segments: string;
  bfd: boolean;
  bfdProfile: string;
  multiHop: boolean;
  source: string;
  sourceProfile: string;
}

export interface InterfaceFields {
  interface: string;
  distance: string;
  disable: boolean;
  vrf: string;
  segments: string;
}

export interface StaticRouteFields {
  destination: string;
  description: string;
  nextHops: NextHopFields[];
  interfaces: InterfaceFields[];
  blackhole: boolean;
  blackholeDistance: string;
  blackholeTag: string;
  reject: boolean;
  rejectDistance: string;
  rejectTag: string;
  dhcpInterfaces: string[];
}

export function emptyNextHop(): NextHopFields {
  return {
    address: "",
    distance: "",
    disable: false,
    interface: "",
    vrf: "",
    segments: "",
    bfd: false,
    bfdProfile: "",
    multiHop: false,
    source: "",
    sourceProfile: "",
  };
}

export function emptyInterface(): InterfaceFields {
  return { interface: "", distance: "", disable: false, vrf: "", segments: "" };
}

/** Form fields for a loaded route (an empty form when creating). */
export function staticRouteFields(route: StaticRoute | null | undefined): StaticRouteFields {
  return {
    destination: text(route?.destination),
    description: text(route?.description),
    nextHops: (route?.next_hops ?? []).map((nh) => ({
      address: text(nh.address),
      distance: text(nh.distance),
      disable: nh.disable,
      interface: text(nh.interface),
      vrf: text(nh.vrf),
      segments: text(nh.segments),
      bfd: nh.bfd_enable,
      bfdProfile: text(nh.bfd_profile),
      multiHop: nh.bfd_multi_hop,
      source: text(nh.bfd_multi_hop_source),
      sourceProfile: text(nh.bfd_multi_hop_source_profile),
    })),
    interfaces: (route?.interfaces ?? []).map((iface) => ({
      interface: text(iface.interface),
      distance: text(iface.distance),
      disable: iface.disable,
      vrf: text(iface.vrf),
      segments: text(iface.segments),
    })),
    blackhole: route?.blackhole ?? false,
    blackholeDistance: text(route?.blackhole_distance),
    blackholeTag: text(route?.blackhole_tag),
    reject: route?.reject ?? false,
    rejectDistance: text(route?.reject_distance),
    rejectTag: text(route?.reject_tag),
    dhcpInterfaces: (route?.dhcp_interfaces ?? []).map(text).filter(Boolean),
  };
}

function hasSegments(family: RouteFamily, features: StaticRouteFeatures): boolean {
  return family === "ipv6" || features.ipv4Segments;
}

function normalizeNextHop(nh: NextHopFields): NextHopFields {
  return {
    address: text(nh.address),
    distance: text(nh.distance),
    disable: nh.disable,
    interface: text(nh.interface),
    vrf: text(nh.vrf),
    segments: text(nh.segments),
    bfd: nh.bfd,
    bfdProfile: text(nh.bfdProfile),
    multiHop: nh.multiHop,
    source: text(nh.source),
    sourceProfile: text(nh.sourceProfile),
  };
}

function normalizeInterface(iface: InterfaceFields): InterfaceFields {
  return {
    interface: text(iface.interface),
    distance: text(iface.distance),
    disable: iface.disable,
    vrf: text(iface.vrf),
    segments: text(iface.segments),
  };
}

function nextHopHasData(nh: NextHopFields): boolean {
  return Boolean(
    nh.distance || nh.disable || nh.interface || nh.vrf || nh.segments || nh.bfd ||
      nh.bfdProfile || nh.multiHop || nh.source || nh.sourceProfile,
  );
}

function interfaceHasData(iface: InterfaceFields): boolean {
  return Boolean(iface.distance || iface.disable || iface.vrf || iface.segments);
}

/** The route as the emit reads it: trimmed, blank new rows dropped. */
function normalizeRoute(route: StaticRouteFields): StaticRouteFields {
  return {
    destination: text(route.destination),
    description: text(route.description),
    nextHops: route.nextHops
      .map(normalizeNextHop)
      .filter((nh) => nh.address || nextHopHasData(nh)),
    interfaces: route.interfaces
      .map(normalizeInterface)
      .filter((iface) => iface.interface || interfaceHasData(iface)),
    blackhole: route.blackhole,
    blackholeDistance: text(route.blackholeDistance),
    blackholeTag: text(route.blackholeTag),
    reject: route.reject,
    rejectDistance: text(route.rejectDistance),
    rejectTag: text(route.rejectTag),
    dhcpInterfaces: route.dhcpInterfaces.map(text).filter(Boolean),
  };
}

export type StaticRouteProblem =
  | { key: "destinationRequired" }
  | { key: "destinationInvalid" }
  | { key: "destinationExists"; name: string }
  | { key: "descriptionTooLong"; max: number }
  | { key: "nextHopAddressRequired" }
  | { key: "nextHopAddressInvalid"; name: string }
  | { key: "nextHopDuplicate"; name: string }
  | { key: "sourceInvalid"; name: string }
  | { key: "sourceProfileWithoutSource"; name: string }
  | { key: "interfaceRequired" }
  | { key: "interfaceDuplicate"; name: string }
  | { key: "blackholeAndReject" }
  | { key: "range"; field: RangeField; min: number; max: number; name?: string };

/**
 * A route the lab would reject, or a form the emit cannot express.
 * `configured` holds the destinations this scope and family already have;
 * a create may not reuse one (it would merge into the existing route).
 */
export function staticRouteProblem(
  original: StaticRouteFields | null,
  route: StaticRouteFields,
  family: RouteFamily,
  configured: string[],
): StaticRouteProblem | null {
  const r = normalizeRoute(route);
  if (!original) {
    if (!r.destination) return { key: "destinationRequired" };
    if (!isPrefix(r.destination, family)) return { key: "destinationInvalid" };
    if (configured.includes(r.destination)) return { key: "destinationExists", name: r.destination };
  }
  if (r.description.length > DESCRIPTION_MAX) return { key: "descriptionTooLong", max: DESCRIPTION_MAX };

  const hops = new Set<string>();
  for (const nh of r.nextHops) {
    if (!nh.address) return { key: "nextHopAddressRequired" };
    if (!isAddress(nh.address, family)) return { key: "nextHopAddressInvalid", name: nh.address };
    if (hops.has(nh.address)) return { key: "nextHopDuplicate", name: nh.address };
    hops.add(nh.address);
    const range = rangeProblem(nh.distance, "distance", nh.address);
    if (range) return range;
    if (nh.bfd && nh.multiHop && nh.source && !isIpv4(nh.source) && !isIpv6(nh.source)) {
      return { key: "sourceInvalid", name: nh.address };
    }
    if (nh.bfd && nh.multiHop && nh.sourceProfile && !nh.source) {
      return { key: "sourceProfileWithoutSource", name: nh.address };
    }
  }

  const ifaces = new Set<string>();
  for (const iface of r.interfaces) {
    if (!iface.interface) return { key: "interfaceRequired" };
    if (ifaces.has(iface.interface)) return { key: "interfaceDuplicate", name: iface.interface };
    ifaces.add(iface.interface);
    const range = rangeProblem(iface.distance, "distance", iface.interface);
    if (range) return range;
  }

  if (r.blackhole && r.reject) return { key: "blackholeAndReject" };
  if (r.blackhole) {
    const range = rangeProblem(r.blackholeDistance, "distance") ?? rangeProblem(r.blackholeTag, "tag");
    if (range) return range;
  }
  if (r.reject) {
    const range = rangeProblem(r.rejectDistance, "distance") ?? rangeProblem(r.rejectTag, "tag");
    if (range) return range;
  }
  return null;
}

function bfdSourceOps(
  ops: LeafOp[],
  key: string,
  before: NextHopFields | null,
  after: NextHopFields,
  features: StaticRouteFeatures,
): void {
  const oldSource = before?.multiHop ? before.source : "";
  const oldProfile = before?.multiHop && features.bfdSourceProfile ? before.sourceProfile : "";
  const newProfile = features.bfdSourceProfile ? after.sourceProfile : "";
  if (oldSource === after.source) {
    if (after.source) {
      leaf(ops, "next_hop_bfd_multi_hop_source_profile", [key, after.source], oldProfile, newProfile);
    }
    return;
  }
  // 1.4 keeps the source as a tag node, so a new address is a second node;
  // drop the old one first. 1.5 holds one value and the set replaces it.
  if (oldSource && (!after.source || features.bfdSourceProfile)) {
    ops.push(del("next_hop_bfd_multi_hop_source", key));
  }
  if (after.source) {
    ops.push(set("next_hop_bfd_multi_hop_source", key, after.source));
    if (newProfile) {
      ops.push(set("next_hop_bfd_multi_hop_source_profile", key, after.source, newProfile));
    }
  }
}

function nextHopOps(
  ops: LeafOp[],
  before: NextHopFields | null,
  after: NextHopFields,
  family: RouteFamily,
  features: StaticRouteFeatures,
): void {
  const key = after.address;
  if (!before) ops.push(set("next_hop", key));
  leaf(ops, "next_hop_distance", [key], before?.distance ?? "", after.distance);
  flag(ops, "next_hop_disable", [key], before?.disable ?? false, after.disable);
  leaf(ops, "next_hop_interface", [key], before?.interface ?? "", after.interface);
  leaf(ops, "next_hop_vrf", [key], before?.vrf ?? "", after.vrf);
  if (hasSegments(family, features)) {
    leaf(ops, "next_hop_segments", [key], before?.segments ?? "", after.segments);
  }

  // `bfd` holds profile and multi-hop; its delete takes them with it.
  const hadBfd = before?.bfd ?? false;
  if (hadBfd && !after.bfd) {
    ops.push(del("next_hop_bfd", key));
    return;
  }
  if (!after.bfd) return;
  if (!hadBfd) ops.push(set("next_hop_bfd", key));
  const was = hadBfd ? before : null;
  leaf(ops, "next_hop_bfd_profile", [key], was?.bfdProfile ?? "", after.bfdProfile);
  const hadMultiHop = was?.multiHop ?? false;
  if (hadMultiHop && !after.multiHop) {
    ops.push(del("next_hop_bfd_multi_hop", key));
    return;
  }
  if (!after.multiHop) return;
  if (!hadMultiHop) ops.push(set("next_hop_bfd_multi_hop", key));
  bfdSourceOps(ops, key, hadMultiHop ? was : null, after, features);
}

function interfaceOps(
  ops: LeafOp[],
  before: InterfaceFields | null,
  after: InterfaceFields,
  family: RouteFamily,
  features: StaticRouteFeatures,
): void {
  const key = after.interface;
  if (!before) ops.push(set("interface", key));
  leaf(ops, "interface_distance", [key], before?.distance ?? "", after.distance);
  flag(ops, "interface_disable", [key], before?.disable ?? false, after.disable);
  leaf(ops, "interface_vrf", [key], before?.vrf ?? "", after.vrf);
  if (hasSegments(family, features)) {
    leaf(ops, "interface_segments", [key], before?.segments ?? "", after.segments);
  }
}

function targetOps(
  ops: LeafOp[],
  name: "blackhole" | "reject",
  before: { on: boolean; distance: string; tag: string },
  after: { on: boolean; distance: string; tag: string },
): void {
  if (before.on && !after.on) {
    ops.push(del(name));
    return;
  }
  if (!after.on) return;
  if (!before.on) ops.push(set(name));
  const was = before.on ? before : { distance: "", tag: "" };
  leaf(ops, `${name}_distance`, [], was.distance, after.distance);
  leaf(ops, `${name}_tag`, [], was.tag, after.tag);
}

/**
 * Leaf ops that turn `original` (null when creating) into `updated`.
 * Leaves the device does not have are not emitted.
 */
export function staticRouteLeafOps(
  original: StaticRouteFields | null,
  updated: StaticRouteFields,
  family: RouteFamily,
  features: StaticRouteFeatures,
): LeafOp[] {
  const before = original ? normalizeRoute(original) : null;
  const after = normalizeRoute(updated);
  const ops: LeafOp[] = [];
  if (!before) ops.push(set(""));
  leaf(ops, "description", [], before?.description ?? "", after.description);

  const oldHops = byName(before?.nextHops ?? [], (nh) => nh.address);
  const newHops = byName(after.nextHops, (nh) => nh.address);
  for (const address of oldHops.keys()) if (!newHops.has(address)) ops.push(del("next_hop", address));
  for (const [address, nh] of newHops) nextHopOps(ops, oldHops.get(address) ?? null, nh, family, features);

  const oldIfaces = byName(before?.interfaces ?? [], (i) => i.interface);
  const newIfaces = byName(after.interfaces, (i) => i.interface);
  for (const name of oldIfaces.keys()) if (!newIfaces.has(name)) ops.push(del("interface", name));
  for (const [name, iface] of newIfaces) interfaceOps(ops, oldIfaces.get(name) ?? null, iface, family, features);

  targetOps(
    ops,
    "blackhole",
    { on: before?.blackhole ?? false, distance: before?.blackholeDistance ?? "", tag: before?.blackholeTag ?? "" },
    { on: after.blackhole, distance: after.blackholeDistance, tag: after.blackholeTag },
  );
  targetOps(
    ops,
    "reject",
    { on: before?.reject ?? false, distance: before?.rejectDistance ?? "", tag: before?.rejectTag ?? "" },
    { on: after.reject, distance: after.rejectDistance, tag: after.rejectTag },
  );

  if (family === "ipv4") multi(ops, "dhcp_interface", [], before?.dhcpInterfaces ?? [], after.dhcpInterfaces);
  return ops;
}

function scopedOp(scope: StaticRouteScope, family: RouteFamily, destination: string, op: LeafOp) {
  const suffix = op.leaf ? `_${op.leaf}` : "";
  const args = [destination, ...op.args];
  if (scope.kind === "vrf") {
    const node = family === "ipv4" ? "route" : "route6";
    return { op: `${op.verb}_vrf_static_${node}${suffix}`, value: [scope.vrf, ...args].join(",") };
  }
  if (scope.kind === "table") {
    return { op: `${op.verb}_table_${family}_route${suffix}`, value: [String(scope.tableId), ...args].join(",") };
  }
  return { op: `${op.verb}_${family}_route${suffix}`, value: args.join(",") };
}

/** Batch ops (global and table routers, or the VRF router) for one route save. */
export function staticRouteSaveOps(
  scope: StaticRouteScope,
  family: RouteFamily,
  original: StaticRouteFields | null,
  updated: StaticRouteFields,
  features: StaticRouteFeatures,
): StaticRoutesBatchOperation[] {
  const destination = text(original ? original.destination : updated.destination);
  return staticRouteLeafOps(original, updated, family, features).map((op) =>
    scopedOp(scope, family, destination, op),
  );
}

export function deleteStaticRouteOps(
  scope: StaticRouteScope,
  family: RouteFamily,
  destination: string,
): StaticRoutesBatchOperation[] {
  return [scopedOp(scope, family, text(destination), del(""))];
}

// ============================================================================
// Routing tables and route-map
// ============================================================================

export interface RoutingTableFields {
  tableId: string;
  description: string;
}

export type RoutingTableProblem =
  | { key: "tableIdRequired" }
  | { key: "tableIdRange"; min: number; max: number }
  | { key: "tableExists"; name: string }
  | { key: "descriptionTooLong"; max: number };

export function routingTableProblem(
  original: RoutingTableFields | null,
  updated: RoutingTableFields,
  configured: number[],
): RoutingTableProblem | null {
  const id = text(updated.tableId);
  if (!original) {
    if (!id) return { key: "tableIdRequired" };
    if (!inRange(id, TABLE_RANGE)) return { key: "tableIdRange", ...TABLE_RANGE };
    if (configured.includes(Number(id))) return { key: "tableExists", name: id };
  }
  if (text(updated.description).length > DESCRIPTION_MAX) {
    return { key: "descriptionTooLong", max: DESCRIPTION_MAX };
  }
  return null;
}

export function routingTableSaveOps(
  original: RoutingTableFields | null,
  updated: RoutingTableFields,
): StaticRoutesBatchOperation[] {
  const id = String(Number(text(original ? original.tableId : updated.tableId)));
  const ops: StaticRoutesBatchOperation[] = [];
  if (!original) ops.push({ op: "set_table", value: id });
  const before = text(original?.description);
  const after = text(updated.description);
  if (before !== after) {
    ops.push(after
      ? { op: "set_table_description", value: `${id},${after}` }
      : { op: "delete_table_description", value: id });
  }
  return ops;
}

export function deleteRoutingTableOps(tableId: number): StaticRoutesBatchOperation[] {
  return [{ op: "delete_table", value: String(tableId) }];
}

export function routeMapSaveOps(before: string, after: string): StaticRoutesBatchOperation[] {
  const was = text(before);
  const now = text(after);
  if (was === now) return [];
  return now ? [{ op: "set_route_map", value: now }] : [{ op: "delete_route_map" }];
}

// ============================================================================
// Static ARP
// ============================================================================

export interface ArpFields {
  interface: string;
  address: string;
  mac: string;
  description: string;
}

export function arpFields(interfaceName: string, entry: ArpEntry | null | undefined): ArpFields {
  return {
    interface: text(interfaceName),
    address: text(entry?.ip_address),
    mac: text(entry?.mac_address),
    description: text(entry?.description),
  };
}

export type ArpProblem =
  | { key: "interfaceRequired" }
  | { key: "ipAddressRequired" }
  | { key: "invalidIpv4Address" }
  | { key: "macAddressRequired" }
  | { key: "invalidMacAddress" }
  | { key: "arpEntryExists"; name: string }
  | { key: "descriptionTooLong"; max: number };

/** `configured` holds `interface|address` of every entry on the device. */
export function arpProblem(original: ArpFields | null, updated: ArpFields, configured: string[]): ArpProblem | null {
  const iface = text(updated.interface);
  const address = text(updated.address);
  const mac = text(updated.mac);
  if (!original) {
    if (!iface) return { key: "interfaceRequired" };
    if (!address) return { key: "ipAddressRequired" };
    if (!isIpv4(address)) return { key: "invalidIpv4Address" };
    if (configured.includes(`${iface}|${address}`)) return { key: "arpEntryExists", name: address };
  }
  if (!mac) return { key: "macAddressRequired" };
  if (!MAC.test(mac)) return { key: "invalidMacAddress" };
  if (text(updated.description).length > DESCRIPTION_MAX) {
    return { key: "descriptionTooLong", max: DESCRIPTION_MAX };
  }
  return null;
}

export function arpSaveOps(original: ArpFields | null, updated: ArpFields): StaticRoutesBatchOperation[] {
  const iface = text(original ? original.interface : updated.interface);
  const address = text(original ? original.address : updated.address);
  const ops: StaticRoutesBatchOperation[] = [];
  if (!original) ops.push({ op: "set_arp_interface", value: iface });
  const mac = text(updated.mac);
  if (mac !== text(original?.mac)) ops.push({ op: "set_arp_entry", value: `${iface},${address},${mac}` });
  const before = text(original?.description);
  const after = text(updated.description);
  if (before !== after) {
    ops.push(after
      ? { op: "set_arp_entry_description", value: `${iface},${address},${after}` }
      : { op: "delete_arp_entry_description", value: `${iface},${address}` });
  }
  return ops;
}

/** The last entry of an interface takes the interface node with it. */
export function deleteArpEntryOps(
  interfaceName: string,
  address: string,
  entriesOnInterface: number,
): StaticRoutesBatchOperation[] {
  const iface = text(interfaceName);
  if (entriesOnInterface <= 1) return [{ op: "delete_arp_interface", value: iface }];
  return [{ op: "delete_arp_entry", value: `${iface},${text(address)}` }];
}

// ============================================================================
// Multicast routes
// ============================================================================

export interface MrouteTargetFields {
  name: string;
  distance: string;
  disable: boolean;
}

export interface MrouteFields {
  prefix: string;
  nextHops: MrouteTargetFields[];
  interfaces: MrouteTargetFields[];
}

/** Whether the device holds multicast routes as one `mroute` node with `disable`. */
export interface MrouteFeatures {
  mroute: boolean;
}

export function emptyMrouteTarget(): MrouteTargetFields {
  return { name: "", distance: "", disable: false };
}

export function mrouteFields(route: MulticastRoute | null | undefined): MrouteFields {
  return {
    prefix: text(route?.prefix),
    nextHops: (route?.next_hops ?? []).map((nh) => ({
      name: text(nh.address),
      distance: text(nh.distance),
      disable: nh.disable,
    })),
    interfaces: (route?.interfaces ?? []).map((iface) => ({
      name: text(iface.interface),
      distance: text(iface.distance),
      disable: iface.disable,
    })),
  };
}

function normalizeTargets(rows: MrouteTargetFields[]): MrouteTargetFields[] {
  return rows
    .map((row) => ({ name: text(row.name), distance: text(row.distance), disable: row.disable }))
    .filter((row) => row.name || row.distance || row.disable);
}

export type MrouteProblem =
  | { key: "prefixRequired" }
  | { key: "prefixInvalid" }
  | { key: "mrouteExists"; name: string }
  | { key: "targetRequired" }
  | { key: "nextHopAddressRequired" }
  | { key: "nextHopAddressInvalid"; name: string }
  | { key: "nextHopDuplicate"; name: string }
  | { key: "interfaceRequired" }
  | { key: "interfaceDuplicate"; name: string }
  | { key: "range"; field: "distance"; min: number; max: number; name?: string };

export function mrouteProblem(
  original: MrouteFields | null,
  updated: MrouteFields,
  configured: string[],
  features: MrouteFeatures,
): MrouteProblem | null {
  const prefix = text(updated.prefix);
  const hops = normalizeTargets(updated.nextHops);
  const ifaces = normalizeTargets(updated.interfaces);
  if (!original) {
    if (!prefix) return { key: "prefixRequired" };
    if (!isPrefix(prefix, "ipv4")) return { key: "prefixInvalid" };
    if (configured.includes(prefix)) return { key: "mrouteExists", name: prefix };
    // 1.4 has no node for the prefix itself; it exists only through a target.
    if (!features.mroute && hops.length === 0 && ifaces.length === 0) return { key: "targetRequired" };
  }
  const seenHops = new Set<string>();
  for (const nh of hops) {
    if (!nh.name) return { key: "nextHopAddressRequired" };
    if (!isIpv4(nh.name)) return { key: "nextHopAddressInvalid", name: nh.name };
    if (seenHops.has(nh.name)) return { key: "nextHopDuplicate", name: nh.name };
    seenHops.add(nh.name);
    if (nh.distance && !inRange(nh.distance, DISTANCE_RANGE)) {
      return { key: "range", field: "distance", ...DISTANCE_RANGE, name: nh.name };
    }
  }
  const seenIfaces = new Set<string>();
  for (const iface of ifaces) {
    if (!iface.name) return { key: "interfaceRequired" };
    if (seenIfaces.has(iface.name)) return { key: "interfaceDuplicate", name: iface.name };
    seenIfaces.add(iface.name);
    if (iface.distance && !inRange(iface.distance, DISTANCE_RANGE)) {
      return { key: "range", field: "distance", ...DISTANCE_RANGE, name: iface.name };
    }
  }
  return null;
}

function mrouteTargetOps(
  ops: StaticRoutesBatchOperation[],
  kind: "next_hop" | "interface",
  prefix: string,
  before: MrouteTargetFields[],
  after: MrouteTargetFields[],
  rootConfigured: boolean,
  features: MrouteFeatures,
): void {
  const oldRows = byName(before, (row) => row.name);
  const newRows = byName(after, (row) => row.name);
  if (after.length === 0 && before.length > 0 && rootConfigured) {
    // Removing the last one deletes the node that holds the list, so 1.4
    // does not keep an empty `multicast route <prefix>`.
    ops.push({ op: kind === "next_hop" ? "delete_mroute_next_hops" : "delete_mroute_interfaces", value: prefix });
    return;
  }
  for (const name of oldRows.keys()) {
    if (!newRows.has(name)) ops.push({ op: `delete_mroute_${kind}`, value: `${prefix},${name}` });
  }
  for (const [name, row] of newRows) {
    const was = oldRows.get(name);
    if (!was) ops.push({ op: `set_mroute_${kind}`, value: `${prefix},${name}` });
    const distanceBefore = was?.distance ?? "";
    if (distanceBefore !== row.distance) {
      ops.push(row.distance
        ? { op: `set_mroute_${kind}_distance`, value: `${prefix},${name},${row.distance}` }
        : { op: `delete_mroute_${kind}_distance`, value: `${prefix},${name}` });
    }
    const disableBefore = features.mroute ? (was?.disable ?? false) : false;
    const disableAfter = features.mroute ? row.disable : false;
    if (disableBefore !== disableAfter) {
      ops.push({ op: `${disableAfter ? "set" : "delete"}_mroute_${kind}_disable`, value: `${prefix},${name}` });
    }
  }
}

export function mrouteSaveOps(
  original: MulticastRoute | null,
  updated: MrouteFields,
  features: MrouteFeatures,
): StaticRoutesBatchOperation[] {
  const before = original ? mrouteFields(original) : null;
  const prefix = text(before ? before.prefix : updated.prefix);
  const ops: StaticRoutesBatchOperation[] = [];
  if (!before && features.mroute) ops.push({ op: "set_mroute", value: prefix });
  mrouteTargetOps(
    ops, "next_hop", prefix, before?.nextHops ?? [], normalizeTargets(updated.nextHops),
    original?.next_hops_configured ?? false, features,
  );
  mrouteTargetOps(
    ops, "interface", prefix, before?.interfaces ?? [], normalizeTargets(updated.interfaces),
    original?.interfaces_configured ?? false, features,
  );
  return ops;
}

export function deleteMrouteOps(route: MulticastRoute, features: MrouteFeatures): StaticRoutesBatchOperation[] {
  const prefix = text(route.prefix);
  if (features.mroute) return [{ op: "delete_mroute", value: prefix }];
  const ops: StaticRoutesBatchOperation[] = [];
  if (route.next_hops_configured) ops.push({ op: "delete_mroute_next_hops", value: prefix });
  if (route.interfaces_configured) ops.push({ op: "delete_mroute_interfaces", value: prefix });
  return ops;
}

// ============================================================================
// Neighbor proxy
// ============================================================================

export type NeighborProxyKind = "arp" | "nd";

export interface NeighborProxyFields {
  kind: NeighborProxyKind;
  address: string;
  interfaces: string[];
}

export type NeighborProxyProblem =
  | { key: "ipAddressRequired" }
  | { key: "invalidIpv4Address" }
  | { key: "invalidIpv6Address" }
  | { key: "interfaceRequired" }
  | { key: "neighborProxyExists"; name: string };

/** `configured` holds `kind|address` of every entry on the device. */
export function neighborProxyProblem(
  original: NeighborProxyFields | null,
  updated: NeighborProxyFields,
  configured: string[],
): NeighborProxyProblem | null {
  const address = text(updated.address);
  if (!original) {
    if (!address) return { key: "ipAddressRequired" };
    if (updated.kind === "arp" && !isIpv4(address)) return { key: "invalidIpv4Address" };
    if (updated.kind === "nd" && !isIpv6(address)) return { key: "invalidIpv6Address" };
    if (configured.includes(`${updated.kind}|${address}`)) return { key: "neighborProxyExists", name: address };
  }
  // VyOS verify refuses an entry without an interface.
  if (updated.interfaces.map(text).filter(Boolean).length === 0) return { key: "interfaceRequired" };
  return null;
}

export function neighborProxySaveOps(
  original: NeighborProxyFields | null,
  updated: NeighborProxyFields,
): StaticRoutesBatchOperation[] {
  const kind = original ? original.kind : updated.kind;
  const address = text(original ? original.address : updated.address);
  const before = (original?.interfaces ?? []).map(text).filter(Boolean);
  const after = updated.interfaces.map(text).filter(Boolean);
  const ops: StaticRoutesBatchOperation[] = [];
  for (const iface of before) {
    if (!after.includes(iface)) ops.push({ op: `delete_neighbor_proxy_${kind}_interface`, value: `${address},${iface}` });
  }
  for (const iface of after) {
    if (!before.includes(iface)) ops.push({ op: `set_neighbor_proxy_${kind}`, value: `${address},${iface}` });
  }
  return ops;
}

export function deleteNeighborProxyOps(kind: NeighborProxyKind, address: string): StaticRoutesBatchOperation[] {
  return [{ op: `delete_neighbor_proxy_${kind}`, value: text(address) }];
}
