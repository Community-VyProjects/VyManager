import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces (matching backend Pydantic models)
// ============================================================================

export interface BgpTimers {
  keepalive: number | null;
  holdtime: number | null;
}

export interface BgpBestpath {
  as_path_confed: boolean;
  as_path_ignore: boolean;
  as_path_multipath_relax: boolean;
  bandwidth: string | null;
  compare_routerid: boolean;
  med: string[] | null;
  peer_type_multipath_relax: boolean;
}

export interface BgpDampening {
  half_life: number | null;
  re_use: number | null;
  start_suppress_time: number | null;
  max_suppress_time: number | null;
}

export interface BgpConfederation {
  identifier: number | null;
  peers: string[] | null;
}

export interface BgpDistanceGlobal {
  external: number | null;
  internal: number | null;
  local: number | null;
}

export interface BgpTcpKeepalive {
  idle: number | null;
  interval: number | null;
  probes: number | null;
}

export interface BgpParameters {
  router_id: string | null;
  cluster_id: string | null;
  default_local_pref: number | null;
  minimum_holdtime: number | null;
  labeled_unicast: string | null;
  log_neighbor_changes: boolean;
  always_compare_med: boolean;
  deterministic_med: boolean;
  ebgp_requires_policy: boolean;
  graceful_shutdown: boolean;
  no_client_to_client_reflection: boolean;
  no_fast_external_failover: boolean;
  allow_martian_nexthop: boolean;
  disable_ebgp_connected_route_check: boolean;
  fast_convergence: boolean;
  network_import_check: boolean;
  reject_as_sets: boolean;
  route_reflector_allow_outbound_policy: boolean;
  suppress_fib_pending: boolean;
  shutdown: boolean;
  no_hard_administrative_reset: boolean;
  no_suppress_duplicates: boolean;
  no_ipv6_auto_ra: boolean;
  bestpath: BgpBestpath;
  dampening: BgpDampening;
  confederation: BgpConfederation;
  distance_global: BgpDistanceGlobal;
  graceful_restart_stalepath_time: number | null;
  conditional_advertisement_timer: number | null;
  tcp_keepalive: BgpTcpKeepalive;
  as_notation: string | null;
  input_queue_limit: number | null;
  output_queue_limit: number | null;
  update_delay_establish_wait: number | null;
  update_delay_max_delay: number | null;
}

export interface BgpNeighborBfd {
  enabled: boolean;
  check_control_plane_failure: boolean;
  profile: string | null;
  strict: boolean;
  strict_hold_time: number | null;
}

export interface BgpNeighborCapability {
  dynamic: boolean;
  extended_nexthop: boolean;
  software_version: boolean;
}

export interface BgpNeighborTimers {
  connect: number | null;
  keepalive: number | null;
  holdtime: number | null;
}

export interface BgpNeighborLocalAs {
  asn: string | null;
  no_prepend_replace_as: boolean;
}

export interface BgpNeighborAddressFamilyConfig {
  route_map_export: string | null;
  route_map_import: string | null;
  prefix_list_export: string | null;
  prefix_list_import: string | null;
  filter_list_export: string | null;
  filter_list_import: string | null;
  distribute_list_export: string | null;
  distribute_list_import: string | null;
  soft_reconfiguration_inbound: boolean;
  route_reflector_client: boolean;
  route_server_client: boolean;
  nexthop_self: boolean;
  nexthop_self_force: boolean;
  addpath_tx_all: boolean;
  addpath_tx_per_as: boolean;
  allowas_in_number: number | null;
  as_override: boolean;
  attribute_unchanged_as_path: boolean;
  attribute_unchanged_med: boolean;
  attribute_unchanged_next_hop: boolean;
  default_originate: boolean;
  default_originate_route_map: string | null;
  maximum_prefix: number | null;
  maximum_prefix_out: number | null;
  remove_private_as: boolean;
  remove_private_as_all: boolean;
  disable_send_community_extended: boolean;
  disable_send_community_standard: boolean;
  weight: number | null;
  unsuppress_map: string | null;
}

export interface BgpNeighbor {
  address: string;
  remote_as: string | null;
  description: string | null;
  peer_group: string | null;
  update_source: string | null;
  password: string | null;
  port: number | null;
  shutdown: boolean;
  passive: boolean;
  solo: boolean;
  enforce_first_as: boolean;
  override_capability: boolean;
  strict_capability_match: boolean;
  disable_capability_negotiation: boolean;
  disable_connected_check: boolean;
  ebgp_multihop: number | null;
  advertisement_interval: number | null;
  graceful_restart: string | null;
  local_as: BgpNeighborLocalAs;
  local_role: string | null;
  local_role_strict: boolean;
  bfd: BgpNeighborBfd;
  link_state: boolean;
  capability: BgpNeighborCapability;
  timers: BgpNeighborTimers;
  ttl_security_hops: number | null;
  address_families: Record<string, BgpNeighborAddressFamilyConfig>;
}

export interface BgpPeerGroup {
  name: string;
  remote_as: string | null;
  description: string | null;
  update_source: string | null;
  password: string | null;
  shutdown: boolean;
  passive: boolean;
  solo: boolean;
  override_capability: boolean;
  disable_capability_negotiation: boolean;
  disable_connected_check: boolean;
  ebgp_multihop: number | null;
  graceful_restart: string | null;
  local_as: BgpNeighborLocalAs;
  local_role: string | null;
  local_role_strict: boolean;
  bfd: BgpNeighborBfd;
  link_state: boolean;
  capability: BgpNeighborCapability;
  ttl_security_hops: number | null;
  address_families: Record<string, BgpNeighborAddressFamilyConfig>;
}

export interface BgpNetwork {
  prefix: string;
  route_map: string | null;
  backdoor: boolean;
  path_limit: number | null;
  label: string | null;
  rd: string | null;
}

export interface BgpAggregateAddress {
  prefix: string;
  as_set: boolean;
  summary_only: boolean;
  route_map: string | null;
}

export interface BgpRedistribute {
  protocol: string;
  metric: string | null;
  route_map: string | null;
  table: string | null;
}

export interface BgpAddressFamily {
  afi: string;
  networks: BgpNetwork[];
  aggregate_addresses: BgpAggregateAddress[];
  redistribute: BgpRedistribute[];
  maximum_paths_ebgp: number | null;
  maximum_paths_ibgp: number | null;
  evpn_flags: string[];
}

export interface BgpListenRange {
  prefix: string;
  peer_group: string | null;
}

export interface BgpListen {
  limit: number | null;
  ranges: BgpListenRange[];
}

export interface BgpConfig {
  system_as: string | null;
  timers: BgpTimers;
  parameters: BgpParameters;
  neighbors: BgpNeighbor[];
  peer_groups: BgpPeerGroup[];
  address_families: BgpAddressFamily[];
  listen: BgpListen;
  bmp: BgpBmp;
  srv6_locator: string | null;
  sid_vpn_per_vrf_export: string | null;
}

export interface BgpBmpMonitor {
  afi: string;
  policy: string;
}

export interface BgpBmpTarget {
  name: string;
  address: string | null;
  port: number | null;
  min_retry: number | null;
  max_retry: number | null;
  mirror: boolean;
  source_interface: string | null;
  monitors: BgpBmpMonitor[];
}

export interface BgpBmp {
  mirror_buffer_limit: number | null;
  targets: BgpBmpTarget[];
}

export interface BgpCapabilities {
  version: string;
  features: {
    neighbors: { supported: boolean; description: string };
    peer_groups: { supported: boolean; description: string };
    address_families: { supported: boolean; description: string };
    listen_ranges: { supported: boolean; description: string };
    bmp: {
      supported: boolean;
      description: string;
      monitor_policies: string[];
      source_interface: boolean;
    };
    srv6: { supported: boolean; description: string };
    local_role: { supported: boolean; description: string };
    path_attribute: { supported: boolean; description: string };
    redistribute_nhrp: { supported: boolean; description: string };
    l2vpn_evpn_control_flags: { supported: boolean; flags: string[]; description: string };
    neighbor_link_state: { supported: boolean };
    peer_group_link_state: { supported: boolean };
    neighbor_bfd_strict: { supported: boolean };
    peer_group_bfd_strict: { supported: boolean };
    peer_group_solo: { supported: boolean };
    as_notation: { supported: boolean; values: string[] };
    input_queue_limit: { supported: boolean };
    output_queue_limit: { supported: boolean };
    update_delay: { supported: boolean };
  };
  redistribute_protocols: {
    "ipv4-unicast": string[];
    "ipv6-unicast": string[];
  };
  redistribute_table_afis: string[];
  address_family_types: {
    neighbor: string[];
    peer_group: string[];
    global: string[];
  };
  instance_name?: string;
  instance_id?: string;
}

export interface BgpBatchOperation {
  op: string;
  value?: string;
}

export interface BgpBatchRequest {
  operations: BgpBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

const MASKED_SECRET = "***";

const BLANK_NEIGHBOR_AF: BgpNeighborAddressFamilyConfig = {
  route_map_export: null,
  route_map_import: null,
  prefix_list_export: null,
  prefix_list_import: null,
  filter_list_export: null,
  filter_list_import: null,
  distribute_list_export: null,
  distribute_list_import: null,
  soft_reconfiguration_inbound: false,
  route_reflector_client: false,
  route_server_client: false,
  nexthop_self: false,
  nexthop_self_force: false,
  addpath_tx_all: false,
  addpath_tx_per_as: false,
  allowas_in_number: null,
  as_override: false,
  attribute_unchanged_as_path: false,
  attribute_unchanged_med: false,
  attribute_unchanged_next_hop: false,
  default_originate: false,
  default_originate_route_map: null,
  maximum_prefix: null,
  maximum_prefix_out: null,
  remove_private_as: false,
  remove_private_as_all: false,
  disable_send_community_extended: false,
  disable_send_community_standard: false,
  weight: null,
  unsuppress_map: null,
};

function pushBfdOps(
  operations: BgpBatchOperation[],
  kind: "neighbor" | "peer_group",
  name: string,
  original: BgpNeighborBfd,
  updated: BgpNeighborBfd,
) {
  if (updated.enabled !== original.enabled && !updated.enabled) {
    operations.push({ op: `delete_${kind}_bfd`, value: name });
    return;
  }
  if (updated.enabled && !original.enabled) {
    operations.push({ op: `set_${kind}_bfd`, value: name });
  }
  if (!updated.enabled) return;
  if (updated.check_control_plane_failure !== original.check_control_plane_failure) {
    operations.push({
      op: updated.check_control_plane_failure
        ? `set_${kind}_bfd_check_control_plane_failure`
        : `delete_${kind}_bfd_check_control_plane_failure`,
      value: name,
    });
  }
  if (updated.profile !== original.profile) {
    operations.push(updated.profile
      ? { op: `set_${kind}_bfd_profile`, value: `${name},${updated.profile}` }
      : { op: `delete_${kind}_bfd_profile`, value: name });
  }
  if (updated.strict !== original.strict) {
    operations.push({
      op: updated.strict ? `set_${kind}_bfd_strict` : `delete_${kind}_bfd_strict`,
      value: name,
    });
  }
  if (updated.strict && updated.strict_hold_time !== original.strict_hold_time) {
    if (updated.strict_hold_time != null) {
      operations.push({ op: `set_${kind}_bfd_strict_hold_time`, value: `${name},${updated.strict_hold_time}` });
    } else if (original.strict_hold_time != null) {
      operations.push({ op: `delete_${kind}_bfd_strict_hold_time`, value: name });
    }
  }
}

function diffNeighborAf(
  operations: BgpBatchOperation[],
  neighbor: string,
  afi: string,
  original: BgpNeighborAddressFamilyConfig,
  updated: BgpNeighborAddressFamilyConfig,
) {
  const v = `${neighbor},${afi}`;
  const flag = (before: boolean, after: boolean, setOp: string, deleteOp: string) => {
    if (before !== after) operations.push({ op: after ? setOp : deleteOp, value: v });
  };
  const text = (before: string | null, after: string | null, setOp: string, deleteOp: string) => {
    if (before === after) return;
    operations.push(after ? { op: setOp, value: `${v},${after}` } : { op: deleteOp, value: v });
  };
  const num = (before: number | null, after: number | null, setOp: string, deleteOp: string) => {
    if (before === after) return;
    operations.push(after != null ? { op: setOp, value: `${v},${after}` } : { op: deleteOp, value: v });
  };
  text(original.route_map_import, updated.route_map_import, "set_neighbor_af_route_map_import", "delete_neighbor_af_route_map_import");
  text(original.route_map_export, updated.route_map_export, "set_neighbor_af_route_map_export", "delete_neighbor_af_route_map_export");
  text(original.prefix_list_import, updated.prefix_list_import, "set_neighbor_af_prefix_list_import", "delete_neighbor_af_prefix_list_import");
  text(original.prefix_list_export, updated.prefix_list_export, "set_neighbor_af_prefix_list_export", "delete_neighbor_af_prefix_list_export");
  text(original.filter_list_import, updated.filter_list_import, "set_neighbor_af_filter_list_import", "delete_neighbor_af_filter_list_import");
  text(original.filter_list_export, updated.filter_list_export, "set_neighbor_af_filter_list_export", "delete_neighbor_af_filter_list_export");
  text(original.distribute_list_import, updated.distribute_list_import, "set_neighbor_af_distribute_list_import", "delete_neighbor_af_distribute_list_import");
  text(original.distribute_list_export, updated.distribute_list_export, "set_neighbor_af_distribute_list_export", "delete_neighbor_af_distribute_list_export");
  flag(original.soft_reconfiguration_inbound, updated.soft_reconfiguration_inbound, "set_neighbor_af_soft_reconfiguration_inbound", "delete_neighbor_af_soft_reconfiguration_inbound");
  flag(original.route_reflector_client, updated.route_reflector_client, "set_neighbor_af_route_reflector_client", "delete_neighbor_af_route_reflector_client");
  flag(original.route_server_client, updated.route_server_client, "set_neighbor_af_route_server_client", "delete_neighbor_af_route_server_client");
  if (!updated.nexthop_self && original.nexthop_self) {
    operations.push({ op: "delete_neighbor_af_nexthop_self", value: v });
  } else if (updated.nexthop_self) {
    if (!original.nexthop_self) operations.push({ op: "set_neighbor_af_nexthop_self", value: v });
    flag(original.nexthop_self_force, updated.nexthop_self_force, "set_neighbor_af_nexthop_self_force", "delete_neighbor_af_nexthop_self_force");
  }
  flag(original.addpath_tx_all, updated.addpath_tx_all, "set_neighbor_af_addpath_tx_all", "delete_neighbor_af_addpath_tx_all");
  flag(original.addpath_tx_per_as, updated.addpath_tx_per_as, "set_neighbor_af_addpath_tx_per_as", "delete_neighbor_af_addpath_tx_per_as");
  num(original.allowas_in_number, updated.allowas_in_number, "set_neighbor_af_allowas_in_number", "delete_neighbor_af_allowas_in");
  flag(original.as_override, updated.as_override, "set_neighbor_af_as_override", "delete_neighbor_af_as_override");
  flag(original.attribute_unchanged_as_path, updated.attribute_unchanged_as_path, "set_neighbor_af_attribute_unchanged_as_path", "delete_neighbor_af_attribute_unchanged_as_path");
  flag(original.attribute_unchanged_med, updated.attribute_unchanged_med, "set_neighbor_af_attribute_unchanged_med", "delete_neighbor_af_attribute_unchanged_med");
  flag(original.attribute_unchanged_next_hop, updated.attribute_unchanged_next_hop, "set_neighbor_af_attribute_unchanged_next_hop", "delete_neighbor_af_attribute_unchanged_next_hop");
  if (!updated.default_originate && original.default_originate) {
    operations.push({ op: "delete_neighbor_af_default_originate", value: v });
  } else if (updated.default_originate) {
    if (!original.default_originate) operations.push({ op: "set_neighbor_af_default_originate", value: v });
    text(original.default_originate_route_map, updated.default_originate_route_map, "set_neighbor_af_default_originate_route_map", "delete_neighbor_af_default_originate_route_map");
  }
  num(original.maximum_prefix, updated.maximum_prefix, "set_neighbor_af_maximum_prefix", "delete_neighbor_af_maximum_prefix");
  num(original.maximum_prefix_out, updated.maximum_prefix_out, "set_neighbor_af_maximum_prefix_out", "delete_neighbor_af_maximum_prefix_out");
  if (!updated.remove_private_as && original.remove_private_as) {
    operations.push({ op: "delete_neighbor_af_remove_private_as", value: v });
  } else if (updated.remove_private_as) {
    if (!original.remove_private_as) operations.push({ op: "set_neighbor_af_remove_private_as", value: v });
    flag(original.remove_private_as_all, updated.remove_private_as_all, "set_neighbor_af_remove_private_as_all", "delete_neighbor_af_remove_private_as_all");
  }
  flag(original.disable_send_community_extended, updated.disable_send_community_extended, "set_neighbor_af_disable_send_community_extended", "delete_neighbor_af_disable_send_community_extended");
  flag(original.disable_send_community_standard, updated.disable_send_community_standard, "set_neighbor_af_disable_send_community_standard", "delete_neighbor_af_disable_send_community_standard");
  num(original.weight, updated.weight, "set_neighbor_af_weight", "delete_neighbor_af_weight");
  text(original.unsuppress_map, updated.unsuppress_map, "set_neighbor_af_unsuppress_map", "delete_neighbor_af_unsuppress_map");
}

function diffPeerGroupAf(
  operations: BgpBatchOperation[],
  name: string,
  afi: string,
  original: BgpNeighborAddressFamilyConfig,
  updated: BgpNeighborAddressFamilyConfig,
) {
  const v = `${name},${afi}`;
  const text = (before: string | null, after: string | null, setOp: string, deleteOp: string) => {
    if (before === after) return;
    operations.push(after ? { op: setOp, value: `${v},${after}` } : { op: deleteOp, value: v });
  };
  const flag = (before: boolean, after: boolean, setOp: string, deleteOp: string) => {
    if (before !== after) operations.push({ op: after ? setOp : deleteOp, value: v });
  };
  text(original.route_map_import, updated.route_map_import, "set_peer_group_af_route_map_import", "delete_peer_group_af_route_map_import");
  text(original.route_map_export, updated.route_map_export, "set_peer_group_af_route_map_export", "delete_peer_group_af_route_map_export");
  flag(original.soft_reconfiguration_inbound, updated.soft_reconfiguration_inbound, "set_peer_group_af_soft_reconfiguration_inbound", "delete_peer_group_af_soft_reconfiguration_inbound");
  flag(original.nexthop_self, updated.nexthop_self, "set_peer_group_af_nexthop_self", "delete_peer_group_af_nexthop_self");
  flag(original.route_reflector_client, updated.route_reflector_client, "set_peer_group_af_route_reflector_client", "delete_peer_group_af_route_reflector_client");
}

export class BgpService {
  async getCapabilities(): Promise<BgpCapabilities> {
    return apiClient.get<BgpCapabilities>("/vyos/bgp/capabilities");
  }

  async getConfig(refresh = false): Promise<BgpConfig> {
    return apiClient.get<BgpConfig>("/vyos/bgp/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: BgpBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/bgp/batch", request);
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // System-level Operations
  // ==========================================================================

  async saveOverview(
    current: BgpConfig,
    systemAs: string,
    routerId: string,
    keepalive: string,
    holdtime: string
  ): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [];

    if (systemAs !== (current.system_as || "")) {
      if (systemAs) {
        operations.push({ op: "set_system_as", value: systemAs });
      } else {
        operations.push({ op: "delete_system_as" });
      }
    }
    if (routerId !== (current.parameters.router_id || "")) {
      if (routerId) {
        operations.push({ op: "set_parameters_router_id", value: routerId });
      } else {
        operations.push({ op: "delete_parameters_router_id" });
      }
    }
    if (keepalive !== (current.timers.keepalive?.toString() || "")) {
      if (keepalive) {
        operations.push({ op: "set_timers_keepalive", value: keepalive });
      } else {
        operations.push({ op: "delete_timers_keepalive" });
      }
    }
    if (holdtime !== (current.timers.holdtime?.toString() || "")) {
      if (holdtime) {
        operations.push({ op: "set_timers_holdtime", value: holdtime });
      } else {
        operations.push({ op: "delete_timers_holdtime" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure({ operations });
  }

  // ==========================================================================
  // Neighbor Operations
  // ==========================================================================

  async createNeighbor(neighbor: BgpNeighbor): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [
      { op: "set_neighbor", value: neighbor.address },
    ];
    const addr = neighbor.address;

    if (neighbor.remote_as) operations.push({ op: "set_neighbor_remote_as", value: `${addr},${neighbor.remote_as}` });
    if (neighbor.description) operations.push({ op: "set_neighbor_description", value: `${addr},${neighbor.description}` });
    if (neighbor.peer_group) operations.push({ op: "set_neighbor_peer_group", value: `${addr},${neighbor.peer_group}` });
    if (neighbor.update_source) operations.push({ op: "set_neighbor_update_source", value: `${addr},${neighbor.update_source}` });
    if (neighbor.password && neighbor.password !== MASKED_SECRET) operations.push({ op: "set_neighbor_password", value: `${addr},${neighbor.password}` });
    if (neighbor.port != null) operations.push({ op: "set_neighbor_port", value: `${addr},${neighbor.port}` });
    if (neighbor.shutdown) operations.push({ op: "set_neighbor_shutdown", value: addr });
    if (neighbor.passive) operations.push({ op: "set_neighbor_passive", value: addr });
    if (neighbor.solo) operations.push({ op: "set_neighbor_solo", value: addr });
    if (neighbor.link_state) operations.push({ op: "set_neighbor_link_state", value: addr });
    if (neighbor.enforce_first_as) operations.push({ op: "set_neighbor_enforce_first_as", value: addr });
    if (neighbor.override_capability) operations.push({ op: "set_neighbor_override_capability", value: addr });
    if (neighbor.disable_capability_negotiation) operations.push({ op: "set_neighbor_disable_capability_negotiation", value: addr });
    if (neighbor.disable_connected_check) operations.push({ op: "set_neighbor_disable_connected_check", value: addr });
    if (neighbor.strict_capability_match) operations.push({ op: "set_neighbor_strict_capability_match", value: addr });
    if (neighbor.ebgp_multihop != null) operations.push({ op: "set_neighbor_ebgp_multihop", value: `${addr},${neighbor.ebgp_multihop}` });
    if (neighbor.advertisement_interval != null) operations.push({ op: "set_neighbor_advertisement_interval", value: `${addr},${neighbor.advertisement_interval}` });
    if (neighbor.graceful_restart) operations.push({ op: "set_neighbor_graceful_restart", value: `${addr},${neighbor.graceful_restart}` });

    if (neighbor.bfd.enabled) {
      operations.push({ op: "set_neighbor_bfd", value: addr });
      if (neighbor.bfd.check_control_plane_failure) operations.push({ op: "set_neighbor_bfd_check_control_plane_failure", value: addr });
      if (neighbor.bfd.profile) operations.push({ op: "set_neighbor_bfd_profile", value: `${addr},${neighbor.bfd.profile}` });
      if (neighbor.bfd.strict) {
        operations.push({ op: "set_neighbor_bfd_strict", value: addr });
        if (neighbor.bfd.strict_hold_time != null) {
          operations.push({ op: "set_neighbor_bfd_strict_hold_time", value: `${addr},${neighbor.bfd.strict_hold_time}` });
        }
      }
    }

    if (neighbor.capability.dynamic) operations.push({ op: "set_neighbor_capability_dynamic", value: addr });
    if (neighbor.capability.extended_nexthop) operations.push({ op: "set_neighbor_capability_extended_nexthop", value: addr });
    if (neighbor.capability.software_version) operations.push({ op: "set_neighbor_capability_software_version", value: addr });

    if (neighbor.timers.connect != null) operations.push({ op: "set_neighbor_timers_connect", value: `${addr},${neighbor.timers.connect}` });
    if (neighbor.timers.keepalive != null) operations.push({ op: "set_neighbor_timers_keepalive", value: `${addr},${neighbor.timers.keepalive}` });
    if (neighbor.timers.holdtime != null) operations.push({ op: "set_neighbor_timers_holdtime", value: `${addr},${neighbor.timers.holdtime}` });

    if (neighbor.local_as.asn) {
      operations.push({ op: "set_neighbor_local_as", value: `${addr},${neighbor.local_as.asn}` });
      if (neighbor.local_as.no_prepend_replace_as) operations.push({ op: "set_neighbor_local_as_no_prepend_replace_as", value: `${addr},${neighbor.local_as.asn}` });
    }
    if (neighbor.local_role) {
      operations.push({ op: "set_neighbor_local_role", value: `${addr},${neighbor.local_role}` });
      if (neighbor.local_role_strict) operations.push({ op: "set_neighbor_local_role_strict", value: `${addr},${neighbor.local_role}` });
    }
    if (neighbor.ttl_security_hops != null) operations.push({ op: "set_neighbor_ttl_security_hops", value: `${addr},${neighbor.ttl_security_hops}` });

    for (const [afi, afConfig] of Object.entries(neighbor.address_families)) {
      operations.push({ op: "set_neighbor_af", value: `${addr},${afi}` });
      this._addNeighborAfOps(operations, addr, afi, afConfig);
    }

    return this.batchConfigure({ operations });
  }

  async updateNeighbor(original: BgpNeighbor, updated: BgpNeighbor): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [];
    const addr = original.address;

    // Value fields
    const valueFields: Array<{ key: keyof BgpNeighbor; setOp: string; deleteOp: string }> = [
      { key: "remote_as", setOp: "set_neighbor_remote_as", deleteOp: "delete_neighbor_remote_as" },
      { key: "description", setOp: "set_neighbor_description", deleteOp: "delete_neighbor_description" },
      { key: "peer_group", setOp: "set_neighbor_peer_group", deleteOp: "delete_neighbor_peer_group" },
      { key: "update_source", setOp: "set_neighbor_update_source", deleteOp: "delete_neighbor_update_source" },
      { key: "password", setOp: "set_neighbor_password", deleteOp: "delete_neighbor_password" },
    ];
    for (const field of valueFields) {
      if (field.key === "password" && updated.password === MASKED_SECRET) continue;
      if (updated[field.key] !== original[field.key]) {
        if (updated[field.key]) {
          operations.push({ op: field.setOp, value: `${addr},${updated[field.key]}` });
        } else {
          operations.push({ op: field.deleteOp, value: addr });
        }
      }
    }

    // Numeric fields
    if (updated.ebgp_multihop !== original.ebgp_multihop) {
      if (updated.ebgp_multihop != null) {
        operations.push({ op: "set_neighbor_ebgp_multihop", value: `${addr},${updated.ebgp_multihop}` });
      } else {
        operations.push({ op: "delete_neighbor_ebgp_multihop", value: addr });
      }
    }
    if (updated.port !== original.port) {
      if (updated.port != null) {
        operations.push({ op: "set_neighbor_port", value: `${addr},${updated.port}` });
      } else {
        operations.push({ op: "delete_neighbor_port", value: addr });
      }
    }
    if (updated.advertisement_interval !== original.advertisement_interval) {
      if (updated.advertisement_interval != null) {
        operations.push({ op: "set_neighbor_advertisement_interval", value: `${addr},${updated.advertisement_interval}` });
      } else {
        operations.push({ op: "delete_neighbor_advertisement_interval", value: addr });
      }
    }

    // Boolean flags
    const boolFlags: Array<{ key: keyof BgpNeighbor; setOp: string; deleteOp: string }> = [
      { key: "shutdown", setOp: "set_neighbor_shutdown", deleteOp: "delete_neighbor_shutdown" },
      { key: "passive", setOp: "set_neighbor_passive", deleteOp: "delete_neighbor_passive" },
      { key: "solo", setOp: "set_neighbor_solo", deleteOp: "delete_neighbor_solo" },
      { key: "link_state", setOp: "set_neighbor_link_state", deleteOp: "delete_neighbor_link_state" },
      { key: "enforce_first_as", setOp: "set_neighbor_enforce_first_as", deleteOp: "delete_neighbor_enforce_first_as" },
      { key: "override_capability", setOp: "set_neighbor_override_capability", deleteOp: "delete_neighbor_override_capability" },
      { key: "disable_capability_negotiation", setOp: "set_neighbor_disable_capability_negotiation", deleteOp: "delete_neighbor_disable_capability_negotiation" },
      { key: "disable_connected_check", setOp: "set_neighbor_disable_connected_check", deleteOp: "delete_neighbor_disable_connected_check" },
      { key: "strict_capability_match", setOp: "set_neighbor_strict_capability_match", deleteOp: "delete_neighbor_strict_capability_match" },
    ];
    for (const flag of boolFlags) {
      if (updated[flag.key] !== original[flag.key]) {
        operations.push({ op: updated[flag.key] ? flag.setOp : flag.deleteOp, value: addr });
      }
    }

    // BFD leaves. Disabling BFD deletes the node; otherwise only the changed leaf is sent.
    pushBfdOps(operations, "neighbor", addr, original.bfd, updated.bfd);

    // Capability
    if (updated.capability.dynamic !== original.capability.dynamic) {
      operations.push({ op: updated.capability.dynamic ? "set_neighbor_capability_dynamic" : "delete_neighbor_capability_dynamic", value: addr });
    }
    if (updated.capability.extended_nexthop !== original.capability.extended_nexthop) {
      operations.push({ op: updated.capability.extended_nexthop ? "set_neighbor_capability_extended_nexthop" : "delete_neighbor_capability_extended_nexthop", value: addr });
    }
    if (updated.capability.software_version !== original.capability.software_version) {
      operations.push({ op: updated.capability.software_version ? "set_neighbor_capability_software_version" : "delete_neighbor_capability_software_version", value: addr });
    }

    // Timers
    const timersChanged = updated.timers.connect !== original.timers.connect ||
      updated.timers.keepalive !== original.timers.keepalive ||
      updated.timers.holdtime !== original.timers.holdtime;
    if (timersChanged) {
      if (original.timers.connect != null || original.timers.keepalive != null || original.timers.holdtime != null) {
        operations.push({ op: "delete_neighbor_timers", value: addr });
      }
      if (updated.timers.connect != null) operations.push({ op: "set_neighbor_timers_connect", value: `${addr},${updated.timers.connect}` });
      if (updated.timers.keepalive != null) operations.push({ op: "set_neighbor_timers_keepalive", value: `${addr},${updated.timers.keepalive}` });
      if (updated.timers.holdtime != null) operations.push({ op: "set_neighbor_timers_holdtime", value: `${addr},${updated.timers.holdtime}` });
    }

    // Graceful restart
    if (updated.graceful_restart !== original.graceful_restart) {
      if (updated.graceful_restart) {
        operations.push({ op: "set_neighbor_graceful_restart", value: `${addr},${updated.graceful_restart}` });
      } else {
        operations.push({ op: "delete_neighbor_graceful_restart", value: addr });
      }
    }

    // Local AS
    if (updated.local_as.asn !== original.local_as.asn || updated.local_as.no_prepend_replace_as !== original.local_as.no_prepend_replace_as) {
      if (original.local_as.asn) operations.push({ op: "delete_neighbor_local_as", value: addr });
      if (updated.local_as.asn) {
        operations.push({ op: "set_neighbor_local_as", value: `${addr},${updated.local_as.asn}` });
        if (updated.local_as.no_prepend_replace_as) operations.push({ op: "set_neighbor_local_as_no_prepend_replace_as", value: `${addr},${updated.local_as.asn}` });
      }
    }

    // Local role
    if (updated.local_role !== original.local_role || updated.local_role_strict !== original.local_role_strict) {
      if (original.local_role) operations.push({ op: "delete_neighbor_local_role", value: addr });
      if (updated.local_role) {
        operations.push({ op: "set_neighbor_local_role", value: `${addr},${updated.local_role}` });
        if (updated.local_role_strict) operations.push({ op: "set_neighbor_local_role_strict", value: `${addr},${updated.local_role}` });
      }
    }

    // TTL security
    if (updated.ttl_security_hops !== original.ttl_security_hops) {
      if (updated.ttl_security_hops != null) {
        operations.push({ op: "set_neighbor_ttl_security_hops", value: `${addr},${updated.ttl_security_hops}` });
      } else {
        operations.push({ op: "delete_neighbor_ttl_security", value: addr });
      }
    }

    // Address families
    const origAFs = new Set(Object.keys(original.address_families));
    const updAFs = new Set(Object.keys(updated.address_families));
    for (const afi of origAFs) {
      if (!updAFs.has(afi)) operations.push({ op: "delete_neighbor_af", value: `${addr},${afi}` });
    }
    for (const afi of updAFs) {
      if (!origAFs.has(afi)) {
        operations.push({ op: "set_neighbor_af", value: `${addr},${afi}` });
        diffNeighborAf(operations, addr, afi, BLANK_NEIGHBOR_AF, updated.address_families[afi]);
      } else {
        diffNeighborAf(operations, addr, afi, original.address_families[afi], updated.address_families[afi]);
      }
    }

    if (operations.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure({ operations });
  }

  async deleteNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_neighbor", value: address }] });
  }

  private _addNeighborAfOps(operations: BgpBatchOperation[], neighbor: string, afi: string, af: BgpNeighborAddressFamilyConfig): void {
    diffNeighborAf(operations, neighbor, afi, BLANK_NEIGHBOR_AF, af);
  }

  // ==========================================================================
  // Peer Group Operations
  // ==========================================================================

  async createPeerGroup(pg: BgpPeerGroup): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [{ op: "set_peer_group", value: pg.name }];
    const name = pg.name;

    if (pg.remote_as) operations.push({ op: "set_peer_group_remote_as", value: `${name},${pg.remote_as}` });
    if (pg.description) operations.push({ op: "set_peer_group_description", value: `${name},${pg.description}` });
    if (pg.update_source) operations.push({ op: "set_peer_group_update_source", value: `${name},${pg.update_source}` });
    if (pg.password && pg.password !== MASKED_SECRET) operations.push({ op: "set_peer_group_password", value: `${name},${pg.password}` });
    if (pg.shutdown) operations.push({ op: "set_peer_group_shutdown", value: name });
    if (pg.passive) operations.push({ op: "set_peer_group_passive", value: name });
    if (pg.solo) operations.push({ op: "set_peer_group_solo", value: name });
    if (pg.link_state) operations.push({ op: "set_peer_group_link_state", value: name });
    if (pg.override_capability) operations.push({ op: "set_peer_group_override_capability", value: name });
    if (pg.disable_capability_negotiation) operations.push({ op: "set_peer_group_disable_capability_negotiation", value: name });
    if (pg.disable_connected_check) operations.push({ op: "set_peer_group_disable_connected_check", value: name });
    if (pg.ebgp_multihop != null) operations.push({ op: "set_peer_group_ebgp_multihop", value: `${name},${pg.ebgp_multihop}` });
    if (pg.bfd.enabled) {
      operations.push({ op: "set_peer_group_bfd", value: name });
      if (pg.bfd.check_control_plane_failure) operations.push({ op: "set_peer_group_bfd_check_control_plane_failure", value: name });
      if (pg.bfd.profile) operations.push({ op: "set_peer_group_bfd_profile", value: `${name},${pg.bfd.profile}` });
      if (pg.bfd.strict) {
        operations.push({ op: "set_peer_group_bfd_strict", value: name });
        if (pg.bfd.strict_hold_time != null) {
          operations.push({ op: "set_peer_group_bfd_strict_hold_time", value: `${name},${pg.bfd.strict_hold_time}` });
        }
      }
    }
    if (pg.capability.dynamic) operations.push({ op: "set_peer_group_capability_dynamic", value: name });
    if (pg.capability.extended_nexthop) operations.push({ op: "set_peer_group_capability_extended_nexthop", value: name });
    if (pg.capability.software_version) operations.push({ op: "set_peer_group_capability_software_version", value: name });
    if (pg.graceful_restart) operations.push({ op: "set_peer_group_graceful_restart", value: `${name},${pg.graceful_restart}` });
    if (pg.local_as.asn) {
      operations.push({ op: "set_peer_group_local_as", value: `${name},${pg.local_as.asn}` });
      if (pg.local_as.no_prepend_replace_as) operations.push({ op: "set_peer_group_local_as_no_prepend_replace_as", value: `${name},${pg.local_as.asn}` });
    }
    if (pg.local_role) {
      operations.push({ op: "set_peer_group_local_role", value: `${name},${pg.local_role}` });
      if (pg.local_role_strict) operations.push({ op: "set_peer_group_local_role_strict", value: `${name},${pg.local_role}` });
    }
    if (pg.ttl_security_hops != null) operations.push({ op: "set_peer_group_ttl_security_hops", value: `${name},${pg.ttl_security_hops}` });

    for (const [afi, afConfig] of Object.entries(pg.address_families)) {
      operations.push({ op: "set_peer_group_af", value: `${name},${afi}` });
      if (afConfig.route_map_import) operations.push({ op: "set_peer_group_af_route_map_import", value: `${name},${afi},${afConfig.route_map_import}` });
      if (afConfig.route_map_export) operations.push({ op: "set_peer_group_af_route_map_export", value: `${name},${afi},${afConfig.route_map_export}` });
      if (afConfig.soft_reconfiguration_inbound) operations.push({ op: "set_peer_group_af_soft_reconfiguration_inbound", value: `${name},${afi}` });
      if (afConfig.nexthop_self) operations.push({ op: "set_peer_group_af_nexthop_self", value: `${name},${afi}` });
      if (afConfig.route_reflector_client) operations.push({ op: "set_peer_group_af_route_reflector_client", value: `${name},${afi}` });
    }

    return this.batchConfigure({ operations });
  }

  async updatePeerGroup(original: BgpPeerGroup, updated: BgpPeerGroup): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [];
    const name = original.name;

    if (updated.remote_as !== original.remote_as) {
      operations.push(updated.remote_as ? { op: "set_peer_group_remote_as", value: `${name},${updated.remote_as}` } : { op: "delete_peer_group_remote_as", value: name });
    }
    if (updated.description !== original.description) {
      operations.push(updated.description ? { op: "set_peer_group_description", value: `${name},${updated.description}` } : { op: "delete_peer_group_description", value: name });
    }
    if (updated.update_source !== original.update_source) {
      operations.push(updated.update_source ? { op: "set_peer_group_update_source", value: `${name},${updated.update_source}` } : { op: "delete_peer_group_update_source", value: name });
    }
    if (updated.password !== MASKED_SECRET && updated.password !== original.password) {
      operations.push(updated.password ? { op: "set_peer_group_password", value: `${name},${updated.password}` } : { op: "delete_peer_group_password", value: name });
    }
    if (updated.ebgp_multihop !== original.ebgp_multihop) {
      operations.push(updated.ebgp_multihop != null ? { op: "set_peer_group_ebgp_multihop", value: `${name},${updated.ebgp_multihop}` } : { op: "delete_peer_group_ebgp_multihop", value: name });
    }
    if (updated.shutdown !== original.shutdown) operations.push({ op: updated.shutdown ? "set_peer_group_shutdown" : "delete_peer_group_shutdown", value: name });
    if (updated.passive !== original.passive) operations.push({ op: updated.passive ? "set_peer_group_passive" : "delete_peer_group_passive", value: name });
    if (updated.solo !== original.solo) operations.push({ op: updated.solo ? "set_peer_group_solo" : "delete_peer_group_solo", value: name });
    if (updated.link_state !== original.link_state) operations.push({ op: updated.link_state ? "set_peer_group_link_state" : "delete_peer_group_link_state", value: name });
    if (updated.override_capability !== original.override_capability) operations.push({ op: updated.override_capability ? "set_peer_group_override_capability" : "delete_peer_group_override_capability", value: name });
    if (updated.disable_capability_negotiation !== original.disable_capability_negotiation) operations.push({ op: updated.disable_capability_negotiation ? "set_peer_group_disable_capability_negotiation" : "delete_peer_group_disable_capability_negotiation", value: name });
    if (updated.disable_connected_check !== original.disable_connected_check) operations.push({ op: updated.disable_connected_check ? "set_peer_group_disable_connected_check" : "delete_peer_group_disable_connected_check", value: name });

    pushBfdOps(operations, "peer_group", name, original.bfd, updated.bfd);

    // Capability
    if (updated.capability.dynamic !== original.capability.dynamic) operations.push({ op: updated.capability.dynamic ? "set_peer_group_capability_dynamic" : "delete_peer_group_capability_dynamic", value: name });
    if (updated.capability.extended_nexthop !== original.capability.extended_nexthop) operations.push({ op: updated.capability.extended_nexthop ? "set_peer_group_capability_extended_nexthop" : "delete_peer_group_capability_extended_nexthop", value: name });
    if (updated.capability.software_version !== original.capability.software_version) operations.push({ op: updated.capability.software_version ? "set_peer_group_capability_software_version" : "delete_peer_group_capability_software_version", value: name });

    // Graceful restart
    if (updated.graceful_restart !== original.graceful_restart) {
      if (updated.graceful_restart) {
        operations.push({ op: "set_peer_group_graceful_restart", value: `${name},${updated.graceful_restart}` });
      } else {
        operations.push({ op: "delete_peer_group_graceful_restart", value: name });
      }
    }

    // Local AS
    if (updated.local_as.asn !== original.local_as.asn || updated.local_as.no_prepend_replace_as !== original.local_as.no_prepend_replace_as) {
      if (original.local_as.asn) operations.push({ op: "delete_peer_group_local_as", value: name });
      if (updated.local_as.asn) {
        operations.push({ op: "set_peer_group_local_as", value: `${name},${updated.local_as.asn}` });
        if (updated.local_as.no_prepend_replace_as) operations.push({ op: "set_peer_group_local_as_no_prepend_replace_as", value: `${name},${updated.local_as.asn}` });
      }
    }

    // Local role
    if (updated.local_role !== original.local_role || updated.local_role_strict !== original.local_role_strict) {
      if (original.local_role) operations.push({ op: "delete_peer_group_local_role", value: name });
      if (updated.local_role) {
        operations.push({ op: "set_peer_group_local_role", value: `${name},${updated.local_role}` });
        if (updated.local_role_strict) operations.push({ op: "set_peer_group_local_role_strict", value: `${name},${updated.local_role}` });
      }
    }

    if (updated.ttl_security_hops !== original.ttl_security_hops) {
      operations.push(updated.ttl_security_hops != null ? { op: "set_peer_group_ttl_security_hops", value: `${name},${updated.ttl_security_hops}` } : { op: "delete_peer_group_ttl_security", value: name });
    }

    const origAFs = new Set(Object.keys(original.address_families));
    const updAFs = new Set(Object.keys(updated.address_families));
    for (const afi of origAFs) { if (!updAFs.has(afi)) operations.push({ op: "delete_peer_group_af", value: `${name},${afi}` }); }
    for (const afi of updAFs) {
      const blank = { ...BLANK_NEIGHBOR_AF };
      if (!origAFs.has(afi)) {
        operations.push({ op: "set_peer_group_af", value: `${name},${afi}` });
        diffPeerGroupAf(operations, name, afi, blank, updated.address_families[afi]);
      } else {
        diffPeerGroupAf(operations, name, afi, original.address_families[afi], updated.address_families[afi]);
      }
    }

    if (operations.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure({ operations });
  }

  async deletePeerGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_peer_group", value: name }] });
  }

  // ==========================================================================
  // Parameters Operations
  // ==========================================================================

  async saveParameters(current: BgpParameters, updated: BgpParameters): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [];

    if (updated.cluster_id !== current.cluster_id) {
      operations.push(updated.cluster_id ? { op: "set_parameters_cluster_id", value: updated.cluster_id } : { op: "delete_parameters_cluster_id" });
    }
    if (updated.default_local_pref !== current.default_local_pref) {
      operations.push(updated.default_local_pref != null ? { op: "set_parameters_default_local_pref", value: String(updated.default_local_pref) } : { op: "delete_parameters_default_local_pref" });
    }

    const flags: Array<{ key: keyof BgpParameters; op: string }> = [
      { key: "log_neighbor_changes", op: "parameters_log_neighbor_changes" },
      { key: "always_compare_med", op: "parameters_always_compare_med" },
      { key: "deterministic_med", op: "parameters_deterministic_med" },
      { key: "ebgp_requires_policy", op: "parameters_ebgp_requires_policy" },
      { key: "graceful_shutdown", op: "parameters_graceful_shutdown" },
      { key: "no_client_to_client_reflection", op: "parameters_no_client_to_client_reflection" },
      { key: "no_fast_external_failover", op: "parameters_no_fast_external_failover" },
      { key: "allow_martian_nexthop", op: "parameters_allow_martian_nexthop" },
      { key: "disable_ebgp_connected_route_check", op: "parameters_disable_ebgp_connected_route_check" },
      { key: "fast_convergence", op: "parameters_fast_convergence" },
      { key: "network_import_check", op: "parameters_network_import_check" },
      { key: "reject_as_sets", op: "parameters_reject_as_sets" },
      { key: "route_reflector_allow_outbound_policy", op: "parameters_route_reflector_allow_outbound_policy" },
      { key: "suppress_fib_pending", op: "parameters_suppress_fib_pending" },
      { key: "shutdown", op: "parameters_shutdown" },
      { key: "no_suppress_duplicates", op: "parameters_no_suppress_duplicates" },
      { key: "no_ipv6_auto_ra", op: "parameters_no_ipv6_auto_ra" },
      { key: "no_hard_administrative_reset", op: "parameters_no_hard_administrative_reset" },
    ];

    for (const flag of flags) {
      if ((updated[flag.key] as boolean) !== (current[flag.key] as boolean)) {
        operations.push({ op: (updated[flag.key] as boolean) ? `set_${flag.op}` : `delete_${flag.op}` });
      }
    }

    // Bestpath
    if (updated.bestpath.as_path_confed !== current.bestpath.as_path_confed) operations.push({ op: updated.bestpath.as_path_confed ? "set_parameters_bestpath_as_path_confed" : "delete_parameters_bestpath_as_path_confed" });
    if (updated.bestpath.as_path_ignore !== current.bestpath.as_path_ignore) operations.push({ op: updated.bestpath.as_path_ignore ? "set_parameters_bestpath_as_path_ignore" : "delete_parameters_bestpath_as_path_ignore" });
    if (updated.bestpath.as_path_multipath_relax !== current.bestpath.as_path_multipath_relax) operations.push({ op: updated.bestpath.as_path_multipath_relax ? "set_parameters_bestpath_as_path_multipath_relax" : "delete_parameters_bestpath_as_path_multipath_relax" });
    if (updated.bestpath.compare_routerid !== current.bestpath.compare_routerid) operations.push({ op: updated.bestpath.compare_routerid ? "set_parameters_bestpath_compare_routerid" : "delete_parameters_bestpath_compare_routerid" });
    if (updated.bestpath.peer_type_multipath_relax !== current.bestpath.peer_type_multipath_relax) operations.push({ op: updated.bestpath.peer_type_multipath_relax ? "set_parameters_bestpath_peer_type_multipath_relax" : "delete_parameters_bestpath_peer_type_multipath_relax" });
    if (updated.as_notation !== current.as_notation) {
      operations.push(updated.as_notation
        ? { op: "set_parameters_as_notation", value: updated.as_notation }
        : { op: "delete_parameters_as_notation" });
    }
    if (updated.input_queue_limit !== current.input_queue_limit) {
      operations.push(updated.input_queue_limit != null
        ? { op: "set_parameters_input_queue_limit", value: String(updated.input_queue_limit) }
        : { op: "delete_parameters_input_queue_limit" });
    }
    if (updated.output_queue_limit !== current.output_queue_limit) {
      operations.push(updated.output_queue_limit != null
        ? { op: "set_parameters_output_queue_limit", value: String(updated.output_queue_limit) }
        : { op: "delete_parameters_output_queue_limit" });
    }
    if (updated.update_delay_establish_wait !== current.update_delay_establish_wait) {
      operations.push(updated.update_delay_establish_wait != null
        ? { op: "set_parameters_update_delay_establish_wait", value: String(updated.update_delay_establish_wait) }
        : { op: "delete_parameters_update_delay_establish_wait" });
    }
    if (updated.update_delay_max_delay !== current.update_delay_max_delay) {
      operations.push(updated.update_delay_max_delay != null
        ? { op: "set_parameters_update_delay_max_delay", value: String(updated.update_delay_max_delay) }
        : { op: "delete_parameters_update_delay_max_delay" });
    }

    // Distance
    const dg = updated.distance_global;
    const cdg = current.distance_global;
    if (dg.external !== cdg.external || dg.internal !== cdg.internal || dg.local !== cdg.local) {
      if (cdg.external != null || cdg.internal != null || cdg.local != null) operations.push({ op: "delete_parameters_distance_global" });
      if (dg.external != null) operations.push({ op: "set_parameters_distance_global_external", value: String(dg.external) });
      if (dg.internal != null) operations.push({ op: "set_parameters_distance_global_internal", value: String(dg.internal) });
      if (dg.local != null) operations.push({ op: "set_parameters_distance_global_local", value: String(dg.local) });
    }

    if (operations.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure({ operations });
  }

  // ==========================================================================
  // Address Family Operations
  // ==========================================================================

  async addNetwork(afi: string, prefix: string, routeMap?: string): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [{ op: "set_af_network", value: `${afi},${prefix}` }];
    if (routeMap) operations.push({ op: "set_af_network_route_map", value: `${afi},${prefix},${routeMap}` });
    return this.batchConfigure({ operations });
  }

  async deleteNetwork(afi: string, prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_af_network", value: `${afi},${prefix}` }] });
  }

  async addRedistribute(afi: string, protocol: string, routeMap?: string, metric?: string): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [{ op: "set_af_redistribute", value: `${afi},${protocol}` }];
    if (routeMap) operations.push({ op: "set_af_redistribute_route_map", value: `${afi},${protocol},${routeMap}` });
    if (metric) operations.push({ op: "set_af_redistribute_metric", value: `${afi},${protocol},${metric}` });
    return this.batchConfigure({ operations });
  }

  async deleteRedistribute(afi: string, protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_af_redistribute", value: `${afi},${protocol}` }] });
  }

  async addRedistributeTable(afi: string, table: string, routeMap?: string, metric?: string): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [{ op: "set_af_redistribute_table", value: `${afi},${table}` }];
    if (routeMap) operations.push({ op: "set_af_redistribute_table_route_map", value: `${afi},${table},${routeMap}` });
    if (metric) operations.push({ op: "set_af_redistribute_table_metric", value: `${afi},${table},${metric}` });
    return this.batchConfigure({ operations });
  }

  async deleteRedistributeTable(afi: string, table: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_af_redistribute_table", value: `${afi},${table}` }] });
  }

  async addAggregateAddress(afi: string, prefix: string, asSet: boolean, summaryOnly: boolean, routeMap?: string): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [{ op: "set_af_aggregate_address", value: `${afi},${prefix}` }];
    if (asSet) operations.push({ op: "set_af_aggregate_address_as_set", value: `${afi},${prefix}` });
    if (summaryOnly) operations.push({ op: "set_af_aggregate_address_summary_only", value: `${afi},${prefix}` });
    if (routeMap) operations.push({ op: "set_af_aggregate_address_route_map", value: `${afi},${prefix},${routeMap}` });
    return this.batchConfigure({ operations });
  }

  async deleteAggregateAddress(afi: string, prefix: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_af_aggregate_address", value: `${afi},${prefix}` }] });
  }

  async setL2vpnEvpnFlag(flag: string, enabled: boolean): Promise<VyOSResponse> {
    const name = flag.replace(/-/g, "_");
    const op = `${enabled ? "set" : "delete"}_af_l2vpn_evpn_${name}`;
    return this.batchConfigure({ operations: [{ op }] });
  }

  async setBmpSourceInterface(name: string, iface: string | null): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [iface
        ? { op: "set_bmp_target_source_interface", value: `${name},${iface}` }
        : { op: "delete_bmp_target_source_interface", value: name }],
    });
  }

  async setBmpMonitor(name: string, afi: string, policy: string, enabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{
        op: enabled ? "set_bmp_target_monitor" : "delete_bmp_target_monitor",
        value: `${name},${afi},${policy}`,
      }],
    });
  }

  async saveBmpTarget(original: BgpBmpTarget | null, updated: BgpBmpTarget): Promise<VyOSResponse> {
    const operations: BgpBatchOperation[] = [];
    const name = updated.name;
    if (!original) operations.push({ op: "set_bmp_target", value: name });
    const text = (before: string | null, after: string | null, setOp: string, deleteOp: string) => {
      if ((original ? before : null) === after) return;
      operations.push(after ? { op: setOp, value: `${name},${after}` } : { op: deleteOp, value: name });
    };
    const num = (before: number | null, after: number | null, setOp: string, deleteOp: string) => {
      if ((original ? before : null) === after) return;
      operations.push(after != null ? { op: setOp, value: `${name},${after}` } : { op: deleteOp, value: name });
    };
    text(original?.address ?? null, updated.address, "set_bmp_target_address", "delete_bmp_target_address");
    num(original?.port ?? null, updated.port, "set_bmp_target_port", "delete_bmp_target_port");
    num(original?.min_retry ?? null, updated.min_retry, "set_bmp_target_min_retry", "delete_bmp_target_min_retry");
    num(original?.max_retry ?? null, updated.max_retry, "set_bmp_target_max_retry", "delete_bmp_target_max_retry");
    if ((original?.mirror ?? false) !== updated.mirror) {
      operations.push({ op: updated.mirror ? "set_bmp_target_mirror" : "delete_bmp_target_mirror", value: name });
    }
    if (operations.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure({ operations });
  }

  async deleteBmpTarget(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_bmp_target", value: name }] });
  }

  async setBmpMirrorBufferLimit(value: number | null): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [value != null
        ? { op: "set_bmp_mirror_buffer_limit", value: String(value) }
        : { op: "delete_bmp_mirror_buffer_limit" }],
    });
  }
}

export const bgpService = new BgpService();
