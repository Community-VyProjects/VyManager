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
  bestpath: BgpBestpath;
  dampening: BgpDampening;
  confederation: BgpConfederation;
  distance_global: BgpDistanceGlobal;
  graceful_restart_stalepath_time: number | null;
  conditional_advertisement_timer: number | null;
  tcp_keepalive: BgpTcpKeepalive;
}

export interface BgpNeighborBfd {
  enabled: boolean;
  check_control_plane_failure: boolean;
  profile: string | null;
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
  override_capability: boolean;
  disable_capability_negotiation: boolean;
  disable_connected_check: boolean;
  ebgp_multihop: number | null;
  graceful_restart: string | null;
  local_as: BgpNeighborLocalAs;
  local_role: string | null;
  local_role_strict: boolean;
  bfd: BgpNeighborBfd;
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
  srv6_locator: string | null;
  sid_vpn_per_vrf_export: string | null;
}

export interface BgpCapabilities {
  version: string;
  features: {
    neighbors: { supported: boolean; description: string };
    peer_groups: { supported: boolean; description: string };
    address_families: { supported: boolean; description: string };
    listen_ranges: { supported: boolean; description: string };
    bmp: { supported: boolean; description: string };
    bmp_local_rib: { supported: boolean; description: string };
    srv6: { supported: boolean; description: string };
    local_role: { supported: boolean; description: string };
    path_attribute: { supported: boolean; description: string };
    redistribute_nhrp: { supported: boolean; description: string };
  };
  address_family_types: {
    neighbor: string[];
    peer_group: string[];
    global: string[];
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
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

class BgpService {
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
    if (neighbor.password) operations.push({ op: "set_neighbor_password", value: `${addr},${neighbor.password}` });
    if (neighbor.port != null) operations.push({ op: "set_neighbor_port", value: `${addr},${neighbor.port}` });
    if (neighbor.shutdown) operations.push({ op: "set_neighbor_shutdown", value: addr });
    if (neighbor.passive) operations.push({ op: "set_neighbor_passive", value: addr });
    if (neighbor.solo) operations.push({ op: "set_neighbor_solo", value: addr });
    if (neighbor.enforce_first_as) operations.push({ op: "set_neighbor_enforce_first_as", value: addr });
    if (neighbor.override_capability) operations.push({ op: "set_neighbor_override_capability", value: addr });
    if (neighbor.disable_capability_negotiation) operations.push({ op: "set_neighbor_disable_capability_negotiation", value: addr });
    if (neighbor.disable_connected_check) operations.push({ op: "set_neighbor_disable_connected_check", value: addr });
    if (neighbor.ebgp_multihop != null) operations.push({ op: "set_neighbor_ebgp_multihop", value: `${addr},${neighbor.ebgp_multihop}` });
    if (neighbor.advertisement_interval != null) operations.push({ op: "set_neighbor_advertisement_interval", value: `${addr},${neighbor.advertisement_interval}` });

    if (neighbor.bfd.enabled) {
      operations.push({ op: "set_neighbor_bfd", value: addr });
      if (neighbor.bfd.check_control_plane_failure) operations.push({ op: "set_neighbor_bfd_check_control_plane_failure", value: addr });
      if (neighbor.bfd.profile) operations.push({ op: "set_neighbor_bfd_profile", value: `${addr},${neighbor.bfd.profile}` });
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

    // Boolean flags
    const boolFlags: Array<{ key: keyof BgpNeighbor; setOp: string; deleteOp: string }> = [
      { key: "shutdown", setOp: "set_neighbor_shutdown", deleteOp: "delete_neighbor_shutdown" },
      { key: "passive", setOp: "set_neighbor_passive", deleteOp: "delete_neighbor_passive" },
      { key: "solo", setOp: "set_neighbor_solo", deleteOp: "delete_neighbor_solo" },
      { key: "enforce_first_as", setOp: "set_neighbor_enforce_first_as", deleteOp: "delete_neighbor_enforce_first_as" },
      { key: "override_capability", setOp: "set_neighbor_override_capability", deleteOp: "delete_neighbor_override_capability" },
      { key: "disable_capability_negotiation", setOp: "set_neighbor_disable_capability_negotiation", deleteOp: "delete_neighbor_disable_capability_negotiation" },
      { key: "disable_connected_check", setOp: "set_neighbor_disable_connected_check", deleteOp: "delete_neighbor_disable_connected_check" },
    ];
    for (const flag of boolFlags) {
      if (updated[flag.key] !== original[flag.key]) {
        operations.push({ op: updated[flag.key] ? flag.setOp : flag.deleteOp, value: addr });
      }
    }

    // BFD
    if (updated.bfd.enabled !== original.bfd.enabled) {
      operations.push({ op: updated.bfd.enabled ? "set_neighbor_bfd" : "delete_neighbor_bfd", value: addr });
    }
    if (updated.bfd.enabled && updated.bfd.profile !== original.bfd.profile && updated.bfd.profile) {
      operations.push({ op: "set_neighbor_bfd_profile", value: `${addr},${updated.bfd.profile}` });
    }

    // Capability
    if (updated.capability.dynamic !== original.capability.dynamic) {
      operations.push({ op: updated.capability.dynamic ? "set_neighbor_capability_dynamic" : "delete_neighbor_capability_dynamic", value: addr });
    }
    if (updated.capability.extended_nexthop !== original.capability.extended_nexthop) {
      operations.push({ op: updated.capability.extended_nexthop ? "set_neighbor_capability_extended_nexthop" : "delete_neighbor_capability_extended_nexthop", value: addr });
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
        this._addNeighborAfOps(operations, addr, afi, updated.address_families[afi]);
      }
    }

    if (operations.length === 0) return { success: true, data: { message: "No changes" } };
    return this.batchConfigure({ operations });
  }

  async deleteNeighbor(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({ operations: [{ op: "delete_neighbor", value: address }] });
  }

  private _addNeighborAfOps(operations: BgpBatchOperation[], neighbor: string, afi: string, af: BgpNeighborAddressFamilyConfig): void {
    const v = `${neighbor},${afi}`;
    if (af.route_map_import) operations.push({ op: "set_neighbor_af_route_map_import", value: `${v},${af.route_map_import}` });
    if (af.route_map_export) operations.push({ op: "set_neighbor_af_route_map_export", value: `${v},${af.route_map_export}` });
    if (af.soft_reconfiguration_inbound) operations.push({ op: "set_neighbor_af_soft_reconfiguration_inbound", value: v });
    if (af.nexthop_self) {
      operations.push({ op: "set_neighbor_af_nexthop_self", value: v });
      if (af.nexthop_self_force) operations.push({ op: "set_neighbor_af_nexthop_self_force", value: v });
    }
    if (af.route_reflector_client) operations.push({ op: "set_neighbor_af_route_reflector_client", value: v });
    if (af.default_originate) {
      operations.push({ op: "set_neighbor_af_default_originate", value: v });
      if (af.default_originate_route_map) operations.push({ op: "set_neighbor_af_default_originate_route_map", value: `${v},${af.default_originate_route_map}` });
    }
    if (af.as_override) operations.push({ op: "set_neighbor_af_as_override", value: v });
    if (af.remove_private_as) {
      operations.push({ op: "set_neighbor_af_remove_private_as", value: v });
      if (af.remove_private_as_all) operations.push({ op: "set_neighbor_af_remove_private_as_all", value: v });
    }
    if (af.maximum_prefix != null) operations.push({ op: "set_neighbor_af_maximum_prefix", value: `${v},${af.maximum_prefix}` });
    if (af.prefix_list_import) operations.push({ op: "set_neighbor_af_prefix_list_import", value: `${v},${af.prefix_list_import}` });
    if (af.prefix_list_export) operations.push({ op: "set_neighbor_af_prefix_list_export", value: `${v},${af.prefix_list_export}` });
    if (af.allowas_in_number != null) operations.push({ op: "set_neighbor_af_allowas_in_number", value: `${v},${af.allowas_in_number}` });
    if (af.weight != null) operations.push({ op: "set_neighbor_af_weight", value: `${v},${af.weight}` });
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
    if (pg.password) operations.push({ op: "set_peer_group_password", value: `${name},${pg.password}` });
    if (pg.shutdown) operations.push({ op: "set_peer_group_shutdown", value: name });
    if (pg.passive) operations.push({ op: "set_peer_group_passive", value: name });
    if (pg.ebgp_multihop != null) operations.push({ op: "set_peer_group_ebgp_multihop", value: `${name},${pg.ebgp_multihop}` });
    if (pg.bfd.enabled) {
      operations.push({ op: "set_peer_group_bfd", value: name });
      if (pg.bfd.profile) operations.push({ op: "set_peer_group_bfd_profile", value: `${name},${pg.bfd.profile}` });
    }
    if (pg.capability.dynamic) operations.push({ op: "set_peer_group_capability_dynamic", value: name });
    if (pg.capability.extended_nexthop) operations.push({ op: "set_peer_group_capability_extended_nexthop", value: name });
    if (pg.local_as.asn) {
      operations.push({ op: "set_peer_group_local_as", value: `${name},${pg.local_as.asn}` });
      if (pg.local_as.no_prepend_replace_as) operations.push({ op: "set_peer_group_local_as_no_prepend_replace_as", value: `${name},${pg.local_as.asn}` });
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
    if (updated.password !== original.password) {
      operations.push(updated.password ? { op: "set_peer_group_password", value: `${name},${updated.password}` } : { op: "delete_peer_group_password", value: name });
    }
    if (updated.ebgp_multihop !== original.ebgp_multihop) {
      operations.push(updated.ebgp_multihop != null ? { op: "set_peer_group_ebgp_multihop", value: `${name},${updated.ebgp_multihop}` } : { op: "delete_peer_group_ebgp_multihop", value: name });
    }
    if (updated.shutdown !== original.shutdown) operations.push({ op: updated.shutdown ? "set_peer_group_shutdown" : "delete_peer_group_shutdown", value: name });
    if (updated.passive !== original.passive) operations.push({ op: updated.passive ? "set_peer_group_passive" : "delete_peer_group_passive", value: name });
    if (updated.bfd.enabled !== original.bfd.enabled) operations.push({ op: updated.bfd.enabled ? "set_peer_group_bfd" : "delete_peer_group_bfd", value: name });
    if (updated.capability.dynamic !== original.capability.dynamic) operations.push({ op: updated.capability.dynamic ? "set_peer_group_capability_dynamic" : "delete_peer_group_capability_dynamic", value: name });
    if (updated.capability.extended_nexthop !== original.capability.extended_nexthop) operations.push({ op: updated.capability.extended_nexthop ? "set_peer_group_capability_extended_nexthop" : "delete_peer_group_capability_extended_nexthop", value: name });

    if (updated.local_as.asn !== original.local_as.asn || updated.local_as.no_prepend_replace_as !== original.local_as.no_prepend_replace_as) {
      if (original.local_as.asn) operations.push({ op: "delete_peer_group_local_as", value: name });
      if (updated.local_as.asn) {
        operations.push({ op: "set_peer_group_local_as", value: `${name},${updated.local_as.asn}` });
        if (updated.local_as.no_prepend_replace_as) operations.push({ op: "set_peer_group_local_as_no_prepend_replace_as", value: `${name},${updated.local_as.asn}` });
      }
    }
    if (updated.ttl_security_hops !== original.ttl_security_hops) {
      operations.push(updated.ttl_security_hops != null ? { op: "set_peer_group_ttl_security_hops", value: `${name},${updated.ttl_security_hops}` } : { op: "delete_peer_group_ttl_security", value: name });
    }

    const origAFs = new Set(Object.keys(original.address_families));
    const updAFs = new Set(Object.keys(updated.address_families));
    for (const afi of origAFs) { if (!updAFs.has(afi)) operations.push({ op: "delete_peer_group_af", value: `${name},${afi}` }); }
    for (const afi of updAFs) {
      if (!origAFs.has(afi)) {
        operations.push({ op: "set_peer_group_af", value: `${name},${afi}` });
        const af = updated.address_families[afi];
        if (af.route_map_import) operations.push({ op: "set_peer_group_af_route_map_import", value: `${name},${afi},${af.route_map_import}` });
        if (af.route_map_export) operations.push({ op: "set_peer_group_af_route_map_export", value: `${name},${afi},${af.route_map_export}` });
        if (af.soft_reconfiguration_inbound) operations.push({ op: "set_peer_group_af_soft_reconfiguration_inbound", value: `${name},${afi}` });
        if (af.nexthop_self) operations.push({ op: "set_peer_group_af_nexthop_self", value: `${name},${afi}` });
        if (af.route_reflector_client) operations.push({ op: "set_peer_group_af_route_reflector_client", value: `${name},${afi}` });
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
}

export const bgpService = new BgpService();
