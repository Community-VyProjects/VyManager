import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PppoeAuthentication {
  username: string | null;
  password: string | null;
}

export interface PppoeDhcpv6PdInterface {
  name: string;
  address: string | null;
  sla_id: string | null;
}

export interface PppoeDhcpv6PdInstance {
  instance: string;
  length: string | null;
  interfaces: PppoeDhcpv6PdInterface[];
}

export interface PppoeDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  pd: PppoeDhcpv6PdInstance[];
}

export interface PppoeIpConfig {
  adjust_mss: string | null;
  disable_forwarding: boolean;
  source_validation: string | null;
}

export interface PppoeIpv6Config {
  adjust_mss: string | null;
  disable_forwarding: boolean;
  address_autoconf: boolean;
  address_interface_identifier: string | null;
}

export interface PppoeInterface {
  name: string;
  type: string;
  description: string | null;
  disabled: boolean;
  access_concentrator: string | null;
  service_name: string | null;
  source_interface: string | null;
  vrf: string | null;
  redirect: string | null;
  connect_on_demand: boolean;
  default_route_distance: string | null;
  no_default_route: boolean;
  no_peer_dns: boolean;
  holdoff: string | null;
  idle_timeout: string | null;
  host_uniq: string | null;
  mtu: string | null;
  mru: string | null;
  local_address: string | null;
  remote_address: string | null;
  addresses: string[];
  authentication: PppoeAuthentication | null;
  dhcpv6_options: PppoeDhcpv6Options | null;
  ip: PppoeIpConfig | null;
  ipv6: PppoeIpv6Config | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
}

export interface PppoeConfigResponse {
  interfaces: PppoeInterface[];
  total: number;
}

export interface PppoeCapabilityFeature {
  supported: boolean;
  description: string;
}

export interface PppoeCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: Record<string, PppoeCapabilityFeature>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface PppoeBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// Config shape passed to createInterface / updateInterface
// ============================================================================

export interface PppoePdInterfaceInput {
  name: string;
  address?: string;
  sla_id?: string;
}

export interface PppoePdInstanceInput {
  instance: string;
  length?: string;
  interfaces?: PppoePdInterfaceInput[];
}

export interface PppoeDhcpv6OptionsInput {
  duid?: string;
  no_release?: boolean;
  no_request_dns?: boolean;
  no_request_domain_name?: boolean;
  parameters_only?: boolean;
  rapid_commit?: boolean;
  temporary?: boolean;
  pd?: PppoePdInstanceInput[];
}

export interface PppoeIpInput {
  adjust_mss?: string;
  adjust_mss_clamp_to_pmtu?: boolean;
  disable_forwarding?: boolean;
  source_validation?: string;
}

export interface PppoeIpv6Input {
  adjust_mss?: string;
  adjust_mss_clamp_to_pmtu?: boolean;
  disable_forwarding?: boolean;
  address_autoconf?: boolean;
  address_dhcpv6?: boolean;
  address_interface_identifier?: string;
}

export interface PppoeCreateConfig {
  name: string;
  description?: string;
  disabled?: boolean;
  access_concentrator?: string;
  service_name?: string;
  source_interface?: string;
  vrf?: string;
  redirect?: string;
  connect_on_demand?: boolean;
  default_route_distance?: string;
  no_default_route?: boolean;
  no_peer_dns?: boolean;
  holdoff?: string;
  idle_timeout?: string;
  host_uniq?: string;
  mtu?: string;
  mru?: string;
  local_address?: string;
  remote_address?: string;
  authentication?: { username?: string; password?: string };
  dhcpv6_options?: PppoeDhcpv6OptionsInput;
  ip?: PppoeIpInput;
  ipv6?: PppoeIpv6Input;
  mirror_ingress?: string;
  mirror_egress?: string;
}

// ============================================================================
// Operation builder helpers
// ============================================================================

function buildDhcpv6Ops(
  dhcpv6: PppoeDhcpv6OptionsInput
): PppoeBatchOperation[] {
  const ops: PppoeBatchOperation[] = [];
  if (dhcpv6.duid) ops.push({ op: "set_dhcpv6_duid", value: dhcpv6.duid });
  if (dhcpv6.no_release) ops.push({ op: "set_dhcpv6_no_release" });
  if (dhcpv6.no_request_dns) ops.push({ op: "set_dhcpv6_no_request_dns" });
  if (dhcpv6.no_request_domain_name) ops.push({ op: "set_dhcpv6_no_request_domain_name" });
  if (dhcpv6.parameters_only) ops.push({ op: "set_dhcpv6_parameters_only" });
  if (dhcpv6.rapid_commit) ops.push({ op: "set_dhcpv6_rapid_commit" });
  if (dhcpv6.temporary) ops.push({ op: "set_dhcpv6_temporary" });

  for (const pd of dhcpv6.pd ?? []) {
    if (!pd.instance) continue;
    ops.push({ op: "set_dhcpv6_pd_instance", value: pd.instance });
    if (pd.length) {
      ops.push({ op: "set_dhcpv6_pd_length", value: `${pd.instance}:${pd.length}` });
    }
    for (const di of pd.interfaces ?? []) {
      if (!di.name) continue;
      ops.push({ op: "set_dhcpv6_pd_interface", value: `${pd.instance}:${di.name}` });
      if (di.address) {
        ops.push({
          op: "set_dhcpv6_pd_interface_address",
          value: `${pd.instance}:${di.name}:${di.address}`,
        });
      }
      if (di.sla_id) {
        ops.push({
          op: "set_dhcpv6_pd_interface_sla_id",
          value: `${pd.instance}:${di.name}:${di.sla_id}`,
        });
      }
    }
  }
  return ops;
}

function buildInterfaceOps(config: PppoeCreateConfig): PppoeBatchOperation[] {
  const ops: PppoeBatchOperation[] = [];

  if (config.description) ops.push({ op: "set_interface_description", value: config.description });
  if (config.disabled) ops.push({ op: "set_interface_disable" });
  if (config.access_concentrator) ops.push({ op: "set_access_concentrator", value: config.access_concentrator });
  if (config.service_name) ops.push({ op: "set_service_name", value: config.service_name });
  if (config.source_interface) ops.push({ op: "set_source_interface", value: config.source_interface });
  if (config.vrf) ops.push({ op: "set_vrf", value: config.vrf });
  if (config.redirect) ops.push({ op: "set_redirect", value: config.redirect });

  if (config.connect_on_demand) ops.push({ op: "set_connect_on_demand" });
  if (config.default_route_distance) ops.push({ op: "set_default_route_distance", value: config.default_route_distance });
  if (config.no_default_route) ops.push({ op: "set_no_default_route" });
  if (config.no_peer_dns) ops.push({ op: "set_no_peer_dns" });
  if (config.holdoff) ops.push({ op: "set_holdoff", value: config.holdoff });
  if (config.idle_timeout) ops.push({ op: "set_idle_timeout", value: config.idle_timeout });
  if (config.host_uniq) ops.push({ op: "set_host_uniq", value: config.host_uniq });
  if (config.mtu) ops.push({ op: "set_mtu", value: config.mtu });
  if (config.mru) ops.push({ op: "set_mru", value: config.mru });
  if (config.local_address) ops.push({ op: "set_local_address", value: config.local_address });
  if (config.remote_address) ops.push({ op: "set_remote_address", value: config.remote_address });

  if (config.authentication) {
    if (config.authentication.username) ops.push({ op: "set_authentication_username", value: config.authentication.username });
    if (config.authentication.password) ops.push({ op: "set_authentication_password", value: config.authentication.password });
  }

  if (config.dhcpv6_options) ops.push(...buildDhcpv6Ops(config.dhcpv6_options));

  if (config.ip) {
    const ip = config.ip;
    if (ip.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ip_adjust_mss_clamp_to_pmtu" });
    else if (ip.adjust_mss) ops.push({ op: "set_ip_adjust_mss", value: ip.adjust_mss });
    if (ip.disable_forwarding) ops.push({ op: "set_ip_disable_forwarding" });
    if (ip.source_validation) ops.push({ op: "set_ip_source_validation", value: ip.source_validation });
  }

  if (config.ipv6) {
    const ipv6 = config.ipv6;
    if (ipv6.address_autoconf) ops.push({ op: "set_ipv6_address_autoconf" });
    if (ipv6.address_dhcpv6) ops.push({ op: "set_address", value: "dhcpv6" });
    if (ipv6.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ipv6_adjust_mss_clamp_to_pmtu" });
    else if (ipv6.adjust_mss) ops.push({ op: "set_ipv6_adjust_mss", value: ipv6.adjust_mss });
    if (ipv6.disable_forwarding) ops.push({ op: "set_ipv6_disable_forwarding" });
    if (ipv6.address_interface_identifier) {
      ops.push({ op: "set_ipv6_address_interface_identifier", value: ipv6.address_interface_identifier });
    }
  }

  if (config.mirror_ingress) ops.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
  if (config.mirror_egress) ops.push({ op: "set_mirror_egress", value: config.mirror_egress });

  return ops;
}

// ============================================================================
// API Service
// ============================================================================

class PppoeService {
  async getCapabilities(): Promise<PppoeCapabilities> {
    return apiClient.get<PppoeCapabilities>("/vyos/pppoe/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<PppoeConfigResponse> {
    return apiClient.get<PppoeConfigResponse>("/vyos/pppoe/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: PppoeBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pppoe/batch", {
      interface: interfaceName,
      operations,
    });
    if (result.success) {
      await this.refreshConfig();
    }
    return result;
  }

  async createInterface(config: PppoeCreateConfig): Promise<VyOSResponse> {
    const ops = buildInterfaceOps(config);
    return this.batchConfigure(config.name, ops);
  }

  async updateInterface(
    name: string,
    current: PppoeInterface,
    updated: Partial<PppoeCreateConfig>
  ): Promise<VyOSResponse> {
    const ops: PppoeBatchOperation[] = [];

    const setOrDeleteValue = (
      key: keyof Pick<
        PppoeCreateConfig,
        | "description"
        | "access_concentrator"
        | "service_name"
        | "source_interface"
        | "vrf"
        | "redirect"
        | "default_route_distance"
        | "holdoff"
        | "idle_timeout"
        | "host_uniq"
        | "mtu"
        | "mru"
        | "local_address"
        | "remote_address"
        | "mirror_ingress"
        | "mirror_egress"
      >,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      if (val) ops.push({ op: setOp, value: val });
      else ops.push({ op: deleteOp });
    };

    const setOrDeleteFlag = (
      key: keyof Pick<
        PppoeCreateConfig,
        | "disabled"
        | "connect_on_demand"
        | "no_default_route"
        | "no_peer_dns"
      >,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      ops.push({ op: val ? setOp : deleteOp });
    };

    setOrDeleteValue("description", "set_interface_description", "delete_interface_description");
    setOrDeleteFlag("disabled", "set_interface_disable", "delete_interface_disable");
    setOrDeleteValue("access_concentrator", "set_access_concentrator", "delete_access_concentrator");
    setOrDeleteValue("service_name", "set_service_name", "delete_service_name");
    setOrDeleteValue("source_interface", "set_source_interface", "delete_source_interface");
    setOrDeleteValue("vrf", "set_vrf", "delete_vrf");
    setOrDeleteValue("redirect", "set_redirect", "delete_redirect");

    setOrDeleteFlag("connect_on_demand", "set_connect_on_demand", "delete_connect_on_demand");
    setOrDeleteValue("default_route_distance", "set_default_route_distance", "delete_default_route_distance");
    setOrDeleteFlag("no_default_route", "set_no_default_route", "delete_no_default_route");
    setOrDeleteFlag("no_peer_dns", "set_no_peer_dns", "delete_no_peer_dns");
    setOrDeleteValue("holdoff", "set_holdoff", "delete_holdoff");
    setOrDeleteValue("idle_timeout", "set_idle_timeout", "delete_idle_timeout");
    setOrDeleteValue("host_uniq", "set_host_uniq", "delete_host_uniq");
    setOrDeleteValue("mtu", "set_mtu", "delete_mtu");
    setOrDeleteValue("mru", "set_mru", "delete_mru");
    setOrDeleteValue("local_address", "set_local_address", "delete_local_address");
    setOrDeleteValue("remote_address", "set_remote_address", "delete_remote_address");

    if (updated.authentication !== undefined) {
      if (updated.authentication.username) {
        ops.push({ op: "set_authentication_username", value: updated.authentication.username });
      } else if (current.authentication?.username) {
        ops.push({ op: "delete_authentication_username" });
      }
      if (updated.authentication.password) {
        ops.push({ op: "set_authentication_password", value: updated.authentication.password });
      } else if (current.authentication?.password) {
        ops.push({ op: "delete_authentication_password" });
      }
    }

    if (updated.dhcpv6_options !== undefined) {
      // Wipe and rebuild DHCPv6 options block entirely to avoid stale subkeys.
      if (current.dhcpv6_options) {
        ops.push({ op: "delete_dhcpv6_options" });
      }
      ops.push(...buildDhcpv6Ops(updated.dhcpv6_options));
    }

    if (updated.ip !== undefined) {
      const ip = updated.ip;
      if (ip.adjust_mss !== undefined || ip.adjust_mss_clamp_to_pmtu !== undefined) {
        if (current.ip?.adjust_mss) ops.push({ op: "delete_ip_adjust_mss" });
        if (ip.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ip_adjust_mss_clamp_to_pmtu" });
        else if (ip.adjust_mss) ops.push({ op: "set_ip_adjust_mss", value: ip.adjust_mss });
      }
      if (ip.disable_forwarding !== undefined) {
        ops.push({ op: ip.disable_forwarding ? "set_ip_disable_forwarding" : "delete_ip_disable_forwarding" });
      }
      if (ip.source_validation !== undefined) {
        if (ip.source_validation) ops.push({ op: "set_ip_source_validation", value: ip.source_validation });
        else ops.push({ op: "delete_ip_source_validation" });
      }
    }

    if (updated.ipv6 !== undefined) {
      const ipv6 = updated.ipv6;
      if (ipv6.address_autoconf !== undefined) {
        ops.push({
          op: ipv6.address_autoconf ? "set_ipv6_address_autoconf" : "delete_ipv6_address_autoconf",
        });
      }
      if (ipv6.address_dhcpv6 !== undefined) {
        const had = current.addresses?.includes("dhcpv6") ?? false;
        if (ipv6.address_dhcpv6 && !had) ops.push({ op: "set_address", value: "dhcpv6" });
        else if (!ipv6.address_dhcpv6 && had) ops.push({ op: "delete_address", value: "dhcpv6" });
      }
      if (ipv6.adjust_mss !== undefined || ipv6.adjust_mss_clamp_to_pmtu !== undefined) {
        if (current.ipv6?.adjust_mss) ops.push({ op: "delete_ipv6_adjust_mss" });
        if (ipv6.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ipv6_adjust_mss_clamp_to_pmtu" });
        else if (ipv6.adjust_mss) ops.push({ op: "set_ipv6_adjust_mss", value: ipv6.adjust_mss });
      }
      if (ipv6.disable_forwarding !== undefined) {
        ops.push({
          op: ipv6.disable_forwarding ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding",
        });
      }
      if (ipv6.address_interface_identifier !== undefined) {
        if (ipv6.address_interface_identifier) {
          ops.push({
            op: "set_ipv6_address_interface_identifier",
            value: ipv6.address_interface_identifier,
          });
        } else {
          ops.push({ op: "delete_ipv6_address_interface_identifier" });
        }
      }
    }

    setOrDeleteValue("mirror_ingress", "set_mirror_ingress", "delete_mirror_ingress");
    setOrDeleteValue("mirror_egress", "set_mirror_egress", "delete_mirror_egress");

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes detected" } };
    }

    return this.batchConfigure(name, ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const pppoeService = new PppoeService();
