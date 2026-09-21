/**
 * Draft, validation and submit logic for the unified static-routing modals.
 *
 * Create and edit were the same form twice for routes, table routes, ARP
 * entries, and routing-table ids. Create sends the fields the operator filled
 * in. Update diffs the draft against the stored record so a cleared field
 * emits a delete (null) and an untouched one is not rewritten. The write
 * target is always the stored identity, never the draft.
 */

import {
  staticRoutesService,
  StaticRoutesService,
  type ArpEntry,
  type InterfaceRoute,
  type NextHop,
  type RoutingTable,
  type StaticRoute,
  type VyOSResponse,
} from "@/lib/api/static-routes";

// ============================================================================
// Shared draft pieces
// ============================================================================

export interface NextHopDraft {
  address: string;
  distance: string;
  disable: boolean;
  vrf: string;
  bfd_enable: boolean;
  bfd_profile: string;
}

export interface InterfaceDraft {
  interface: string;
  distance: string;
  disable: boolean;
}

export const emptyNextHopDraft = (): NextHopDraft => ({
  address: "",
  distance: "",
  disable: false,
  vrf: "",
  bfd_enable: false,
  bfd_profile: "",
});

export const emptyInterfaceDraft = (): InterfaceDraft => ({
  interface: "",
  distance: "",
  disable: false,
});

const optionalInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const hopsFrom = (hops: NextHop[]): NextHopDraft[] =>
  hops.map((nh) => ({
    address: nh.address,
    distance: nh.distance?.toString() || "",
    disable: nh.disable,
    vrf: nh.vrf || "",
    bfd_enable: nh.bfd_enable,
    bfd_profile: nh.bfd_profile || "",
  }));

const interfacesFrom = (ifaces: InterfaceRoute[]): InterfaceDraft[] =>
  ifaces.map((iface) => ({
    interface: iface.interface,
    distance: iface.distance?.toString() || "",
    disable: iface.disable,
  }));

const nextHopsPayload = (drafts: NextHopDraft[]): NextHop[] =>
  drafts
    .filter((nh) => nh.address.trim())
    .map((nh) => ({
      address: nh.address.trim(),
      distance: optionalInt(nh.distance),
      disable: nh.disable,
      vrf: nh.vrf.trim() || null,
      interface: null,
      bfd_enable: nh.bfd_enable,
      bfd_profile: nh.bfd_profile.trim() || null,
      bfd_multi_hop: false,
      bfd_multi_hop_source: null,
      segments: null,
    }));

const interfacesPayload = (drafts: InterfaceDraft[]): InterfaceRoute[] =>
  drafts
    .filter((iface) => iface.interface.trim())
    .map((iface) => ({
      interface: iface.interface.trim(),
      distance: optionalInt(iface.distance),
      disable: iface.disable,
      vrf: null,
      segments: null,
    }));

const hopsKey = (hops: NextHop[]): string =>
  JSON.stringify(
    hops.map((nh) => ({
      address: nh.address,
      distance: nh.distance ?? null,
      disable: nh.disable,
      vrf: nh.vrf || null,
      bfd_enable: nh.bfd_enable,
      bfd_profile: nh.bfd_profile || null,
    })),
  );

const ifacesKey = (ifaces: InterfaceRoute[]): string =>
  JSON.stringify(
    ifaces.map((iface) => ({
      interface: iface.interface,
      distance: iface.distance ?? null,
      disable: iface.disable,
    })),
  );

const numOrNull = (value: number | null | undefined): number | null =>
  value == null ? null : value;

// ============================================================================
// Global static route
// ============================================================================

export interface StaticRouteDraft {
  destination: string;
  routeType: "ipv4" | "ipv6";
  description: string;
  nextHops: NextHopDraft[];
  interfaces: InterfaceDraft[];
  isBlackhole: boolean;
  blackholeDistance: string;
  blackholeTag: string;
  isReject: boolean;
  rejectDistance: string;
  rejectTag: string;
  dhcpInterface: string;
}

export const emptyStaticRouteDraft = (
  routeType: "ipv4" | "ipv6" = "ipv4",
): StaticRouteDraft => ({
  destination: "",
  routeType,
  description: "",
  nextHops: [],
  interfaces: [],
  isBlackhole: false,
  blackholeDistance: "",
  blackholeTag: "",
  isReject: false,
  rejectDistance: "",
  rejectTag: "",
  dhcpInterface: "",
});

export function staticRouteDraftFrom(current: StaticRoute): StaticRouteDraft {
  const draft = emptyStaticRouteDraft(current.route_type);
  draft.destination = current.destination;
  draft.description = current.description ?? "";
  draft.nextHops = hopsFrom(current.next_hops || []);
  draft.interfaces = interfacesFrom(current.interfaces || []);
  draft.isBlackhole = current.blackhole;
  draft.blackholeDistance = current.blackhole_distance?.toString() || "";
  draft.blackholeTag = current.blackhole_tag?.toString() || "";
  draft.isReject = current.reject;
  draft.rejectDistance = current.reject_distance?.toString() || "";
  draft.rejectTag = current.reject_tag?.toString() || "";
  draft.dhcpInterface = current.dhcp_interfaces?.[0] || "";
  return draft;
}

export function validateStaticRouteCreate(draft: StaticRouteDraft): string | null {
  if (!draft.destination.trim()) {
    return "Destination is required";
  }
  return validateStaticRouteShared(draft);
}

export function validateStaticRouteEdit(draft: StaticRouteDraft): string | null {
  return validateStaticRouteShared(draft);
}

function validateStaticRouteShared(draft: StaticRouteDraft): string | null {
  const hops = nextHopsPayload(draft.nextHops);
  const ifaces = interfacesPayload(draft.interfaces);
  if (
    draft.routeType === "ipv4" &&
    hops.length === 0 &&
    ifaces.length === 0 &&
    !draft.isBlackhole &&
    !draft.isReject &&
    !draft.dhcpInterface.trim()
  ) {
    return "At least one routing method is required (next-hop, interface, blackhole, or reject)";
  }
  return null;
}

export function buildStaticRouteCreateConfig(
  draft: StaticRouteDraft,
  dhcpSupported: boolean,
): Partial<StaticRoute> {
  const config: Partial<StaticRoute> = {};
  if (draft.description.trim()) config.description = draft.description.trim();

  const hops = nextHopsPayload(draft.nextHops);
  if (hops.length > 0) config.next_hops = hops;

  const ifaces = interfacesPayload(draft.interfaces);
  if (ifaces.length > 0) config.interfaces = ifaces;

  if (draft.isBlackhole) {
    config.blackhole = true;
    const distance = optionalInt(draft.blackholeDistance);
    if (distance != null) config.blackhole_distance = distance;
    const tag = optionalInt(draft.blackholeTag);
    if (tag != null) config.blackhole_tag = tag;
  }

  if (draft.isReject) {
    config.reject = true;
    const distance = optionalInt(draft.rejectDistance);
    if (distance != null) config.reject_distance = distance;
    const tag = optionalInt(draft.rejectTag);
    if (tag != null) config.reject_tag = tag;
  }

  if (dhcpSupported && draft.dhcpInterface.trim()) {
    config.dhcp_interfaces = [draft.dhcpInterface.trim()];
  }

  return config;
}

export function buildStaticRouteUpdateConfig(
  draft: StaticRouteDraft,
  current: StaticRoute,
  dhcpSupported: boolean,
): Partial<StaticRoute> | null {
  const updated: Partial<StaticRoute> = {};

  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }

  const hops = nextHopsPayload(draft.nextHops);
  if (hopsKey(hops) !== hopsKey(current.next_hops || [])) {
    updated.next_hops = hops;
  }

  const ifaces = interfacesPayload(draft.interfaces);
  if (ifacesKey(ifaces) !== ifacesKey(current.interfaces || [])) {
    updated.interfaces = ifaces;
  }

  const blackholeDistance = optionalInt(draft.blackholeDistance);
  const blackholeTag = optionalInt(draft.blackholeTag);
  if (
    draft.isBlackhole !== current.blackhole ||
    blackholeDistance !== numOrNull(current.blackhole_distance) ||
    blackholeTag !== numOrNull(current.blackhole_tag)
  ) {
    updated.blackhole = draft.isBlackhole;
    if (draft.isBlackhole) {
      if (blackholeDistance != null) updated.blackhole_distance = blackholeDistance;
      if (blackholeTag != null) updated.blackhole_tag = blackholeTag;
    }
  }

  const rejectDistance = optionalInt(draft.rejectDistance);
  const rejectTag = optionalInt(draft.rejectTag);
  if (
    draft.isReject !== current.reject ||
    rejectDistance !== numOrNull(current.reject_distance) ||
    rejectTag !== numOrNull(current.reject_tag)
  ) {
    updated.reject = draft.isReject;
    if (draft.isReject) {
      if (rejectDistance != null) updated.reject_distance = rejectDistance;
      if (rejectTag != null) updated.reject_tag = rejectTag;
    }
  }

  if (dhcpSupported) {
    const currentDhcp = current.dhcp_interfaces?.[0] || "";
    if (draft.dhcpInterface.trim() !== currentDhcp) {
      updated.dhcp_interfaces = draft.dhcpInterface.trim()
        ? [draft.dhcpInterface.trim()]
        : [];
    }
  }

  return Object.keys(updated).length > 0 ? updated : null;
}

export function submitStaticRouteCreate(
  draft: StaticRouteDraft,
  dhcpSupported: boolean,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse> {
  const config = buildStaticRouteCreateConfig(draft, dhcpSupported);
  if (draft.routeType === "ipv4") {
    return service.createIPv4Route(draft.destination.trim(), config);
  }
  return service.createIPv6Route(draft.destination.trim(), config);
}

/**
 * The destination comes from the stored record, never the draft, so a locked
 * identity field cannot retarget the write.
 */
export async function submitStaticRouteUpdate(
  current: StaticRoute,
  draft: StaticRouteDraft,
  dhcpSupported: boolean,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse | null> {
  const config = buildStaticRouteUpdateConfig(draft, current, dhcpSupported);
  if (!config) return null;
  return service.updateRoute(current.destination, current.route_type, current, config);
}

// ============================================================================
// Table route
// ============================================================================

export interface TableRouteDraft {
  destination: string;
  routeType: "ipv4" | "ipv6";
  description: string;
  nextHops: NextHopDraft[];
  interfaces: InterfaceDraft[];
  isBlackhole: boolean;
  blackholeDistance: string;
  isReject: boolean;
  rejectDistance: string;
}

export const emptyTableRouteDraft = (): TableRouteDraft => ({
  destination: "",
  routeType: "ipv4",
  description: "",
  nextHops: [],
  interfaces: [],
  isBlackhole: false,
  blackholeDistance: "",
  isReject: false,
  rejectDistance: "",
});

export function tableRouteDraftFrom(current: StaticRoute): TableRouteDraft {
  const draft = emptyTableRouteDraft();
  draft.destination = current.destination;
  draft.routeType = current.route_type;
  draft.description = current.description ?? "";
  draft.nextHops = hopsFrom(current.next_hops || []);
  draft.interfaces = interfacesFrom(current.interfaces || []);
  draft.isBlackhole = current.blackhole;
  draft.blackholeDistance = current.blackhole_distance?.toString() || "";
  draft.isReject = current.reject;
  draft.rejectDistance = current.reject_distance?.toString() || "";
  return draft;
}

export function validateTableRouteCreate(draft: TableRouteDraft): string | null {
  if (!draft.destination.trim()) {
    return "Destination is required";
  }
  const ipv4Cidr = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  const ipv6Cidr = /^[0-9a-fA-F:]+\/\d{1,3}$/;
  if (draft.routeType === "ipv4" && !ipv4Cidr.test(draft.destination.trim())) {
    return "Invalid IPv4 CIDR format (e.g., 10.0.0.0/8)";
  }
  if (draft.routeType === "ipv6" && !ipv6Cidr.test(draft.destination.trim())) {
    return "Invalid IPv6 CIDR format (e.g., 2001:db8::/32)";
  }
  return validateTableRouteShared(draft);
}

export function validateTableRouteEdit(draft: TableRouteDraft): string | null {
  return validateTableRouteShared(draft);
}

function validateTableRouteShared(draft: TableRouteDraft): string | null {
  const hops = nextHopsPayload(draft.nextHops);
  const ifaces = interfacesPayload(draft.interfaces);
  if (!draft.isBlackhole && !draft.isReject && hops.length === 0 && ifaces.length === 0) {
    return "At least one next-hop, interface, blackhole, or reject is required";
  }
  return null;
}

function tableRouteConfigFrom(draft: TableRouteDraft): Partial<StaticRoute> {
  const hops = nextHopsPayload(draft.nextHops);
  const ifaces = interfacesPayload(draft.interfaces);
  return {
    description: draft.description.trim() || undefined,
    next_hops: hops,
    interfaces: ifaces,
    blackhole: draft.isBlackhole,
    blackhole_distance: optionalInt(draft.blackholeDistance) ?? undefined,
    reject: draft.isReject,
    reject_distance: optionalInt(draft.rejectDistance) ?? undefined,
  };
}

export function buildTableRouteCreateConfig(draft: TableRouteDraft): Partial<StaticRoute> {
  return tableRouteConfigFrom(draft);
}

export function buildTableRouteUpdateConfig(
  draft: TableRouteDraft,
  current: StaticRoute,
): Partial<StaticRoute> | null {
  const updated: Partial<StaticRoute> = {};
  const next = tableRouteConfigFrom(draft);

  if ((next.description || "") !== (current.description || "")) {
    updated.description = next.description;
  }

  const hops = next.next_hops || [];
  if (hopsKey(hops) !== hopsKey(current.next_hops || [])) {
    updated.next_hops = hops;
  }

  const ifaces = next.interfaces || [];
  if (ifacesKey(ifaces) !== ifacesKey(current.interfaces || [])) {
    updated.interfaces = ifaces;
  }

  const blackholeDistance = optionalInt(draft.blackholeDistance);
  if (
    draft.isBlackhole !== current.blackhole ||
    blackholeDistance !== numOrNull(current.blackhole_distance)
  ) {
    updated.blackhole = draft.isBlackhole;
    if (draft.isBlackhole && blackholeDistance != null) {
      updated.blackhole_distance = blackholeDistance;
    }
  }

  const rejectDistance = optionalInt(draft.rejectDistance);
  if (
    draft.isReject !== current.reject ||
    rejectDistance !== numOrNull(current.reject_distance)
  ) {
    updated.reject = draft.isReject;
    if (draft.isReject && rejectDistance != null) {
      updated.reject_distance = rejectDistance;
    }
  }

  return Object.keys(updated).length > 0 ? updated : null;
}

export function submitTableRouteCreate(
  tableId: number,
  draft: TableRouteDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse> {
  return service.createTableRoute(
    tableId,
    draft.destination.trim(),
    draft.routeType,
    buildTableRouteCreateConfig(draft),
  );
}

export async function submitTableRouteUpdate(
  tableId: number,
  current: StaticRoute,
  draft: TableRouteDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse | null> {
  const config = buildTableRouteUpdateConfig(draft, current);
  if (!config) return null;
  return service.updateTableRoute(
    tableId,
    current.destination,
    current.route_type,
    current,
    config,
  );
}

// ============================================================================
// ARP
// ============================================================================

export interface ArpDraft {
  interfaceName: string;
  ipAddress: string;
  macAddress: string;
  description: string;
}

export const emptyArpDraft = (): ArpDraft => ({
  interfaceName: "",
  ipAddress: "",
  macAddress: "",
  description: "",
});

export function arpDraftFrom(interfaceName: string, entry: ArpEntry): ArpDraft {
  return {
    interfaceName,
    ipAddress: entry.ip_address,
    macAddress: entry.mac_address,
    description: entry.description ?? "",
  };
}

const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export function validateArpCreate(draft: ArpDraft): string | null {
  if (!draft.interfaceName) return "Interface is required";
  if (!draft.ipAddress) return "IP address is required";
  if (!IPV4_RE.test(draft.ipAddress)) return "Invalid IPv4 address format";
  return validateArpShared(draft);
}

export function validateArpEdit(draft: ArpDraft): string | null {
  return validateArpShared(draft);
}

function validateArpShared(draft: ArpDraft): string | null {
  if (!draft.macAddress) return "MAC address is required";
  if (!MAC_RE.test(draft.macAddress)) {
    return "Invalid MAC address format (use XX:XX:XX:XX:XX:XX)";
  }
  return null;
}

export function submitArpCreate(
  draft: ArpDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse> {
  return service.createArpEntry(
    draft.interfaceName,
    draft.ipAddress,
    draft.macAddress,
    draft.description.trim() || undefined,
  );
}

export async function submitArpUpdate(
  current: { interfaceName: string; entry: ArpEntry },
  draft: ArpDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse | null> {
  const macChanged = draft.macAddress !== current.entry.mac_address;
  const descriptionChanged =
    draft.description.trim() !== (current.entry.description || "");
  if (!macChanged && !descriptionChanged) return null;
  return service.updateArpEntry(
    current.interfaceName,
    current.entry.ip_address,
    draft.macAddress,
    draft.description.trim() || undefined,
  );
}

// ============================================================================
// Routing table id
// ============================================================================

export interface RoutingTableDraft {
  tableId: string;
  description: string;
}

export const emptyRoutingTableDraft = (): RoutingTableDraft => ({
  tableId: "",
  description: "",
});

export function routingTableDraftFrom(current: RoutingTable): RoutingTableDraft {
  return {
    tableId: current.table_id.toString(),
    description: current.description ?? "",
  };
}

export function validateRoutingTableCreate(draft: RoutingTableDraft): string | null {
  if (!draft.tableId) return "Table ID is required";
  const tableIdNum = parseInt(draft.tableId, 10);
  if (Number.isNaN(tableIdNum) || tableIdNum < 1 || tableIdNum > 200) {
    return "Table ID must be a number between 1 and 200";
  }
  return null;
}

export function submitRoutingTableCreate(
  draft: RoutingTableDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse> {
  return service.createRoutingTable(
    parseInt(draft.tableId, 10),
    draft.description.trim() || undefined,
  );
}

export async function submitRoutingTableUpdate(
  current: RoutingTable,
  draft: RoutingTableDraft,
  service: StaticRoutesService = staticRoutesService,
): Promise<VyOSResponse | null> {
  if (draft.description.trim() === (current.description || "")) return null;
  return service.updateRoutingTableDescription(current.table_id, draft.description);
}
