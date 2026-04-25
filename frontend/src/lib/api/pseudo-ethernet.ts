import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PseudoEthernetDhcpOptions {
  client_id: string | null;
  host_name: string | null;
  vendor_class_id: string | null;
  user_class: string | null;
  no_default_route: boolean;
  default_route_distance: string | null;
  reject: string[];
  mtu: boolean;
}

export interface PseudoEthernetDhcpv6PdInterface {
  name: string;
  address: string | null;
  sla_id: string | null;
}

export interface PseudoEthernetDhcpv6PdInstance {
  instance: string;
  length: string | null;
  interfaces: PseudoEthernetDhcpv6PdInterface[];
}

export interface PseudoEthernetDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  pd: PseudoEthernetDhcpv6PdInstance[];
}

export interface PseudoEthernetIpSettings {
  adjust_mss: string | null;
  arp_cache_timeout: string | null;
  disable_arp_filter: boolean;
  enable_arp_accept: boolean;
  enable_arp_announce: boolean;
  enable_arp_ignore: boolean;
  enable_directed_broadcast: boolean;
  enable_proxy_arp: boolean;
  proxy_arp_pvlan: boolean;
  disable_forwarding: boolean;
  source_validation: string | null;
}

export interface PseudoEthernetIpv6Settings {
  accept_dad: string | null;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
  address_autoconf: boolean;
  address_eui64: string[];
  address_no_default_link_local: boolean;
  address_interface_identifier: string | null;
}

export interface PseudoEthernetMirror {
  ingress: string | null;
  egress: string | null;
}

export interface PseudoEthernetVifConfig {
  vlan_id: string;
  description: string | null;
  disabled: boolean;
  disable_link_detect: boolean;
  addresses: string[];
  mtu: string | null;
  mac: string | null;
  vrf: string | null;
  redirect: string | null;
  egress_qos: string | null;
  ingress_qos: string | null;
  dhcp_options: PseudoEthernetDhcpOptions | null;
  dhcpv6_options: PseudoEthernetDhcpv6Options | null;
  ip: PseudoEthernetIpSettings | null;
  ipv6: PseudoEthernetIpv6Settings | null;
  mirror: PseudoEthernetMirror | null;
}

export interface PseudoEthernetVifSConfig {
  vlan_id: string;
  description: string | null;
  disabled: boolean;
  disable_link_detect: boolean;
  addresses: string[];
  mtu: string | null;
  mac: string | null;
  vrf: string | null;
  redirect: string | null;
  dhcp_options: PseudoEthernetDhcpOptions | null;
  dhcpv6_options: PseudoEthernetDhcpv6Options | null;
  ip: PseudoEthernetIpSettings | null;
  ipv6: PseudoEthernetIpv6Settings | null;
  mirror: PseudoEthernetMirror | null;
  vif_c: PseudoEthernetVifCConfig[];
}

export interface PseudoEthernetVifCConfig {
  vlan_id: string;
  description: string | null;
  disabled: boolean;
  disable_link_detect: boolean;
  addresses: string[];
  mtu: string | null;
  mac: string | null;
  vrf: string | null;
  redirect: string | null;
  dhcp_options: PseudoEthernetDhcpOptions | null;
  dhcpv6_options: PseudoEthernetDhcpv6Options | null;
  ip: PseudoEthernetIpSettings | null;
  ipv6: PseudoEthernetIpv6Settings | null;
  mirror: PseudoEthernetMirror | null;
}

export interface PseudoEthernetInterface {
  name: string;
  type: string;
  description: string | null;
  disabled: boolean;
  disable_link_detect: boolean;
  source_interface: string | null;
  mode: string | null;
  mac: string | null;
  mtu: string | null;
  vrf: string | null;
  redirect: string | null;
  addresses: string[];
  dhcp_options: PseudoEthernetDhcpOptions | null;
  dhcpv6_options: PseudoEthernetDhcpv6Options | null;
  ip: PseudoEthernetIpSettings | null;
  ipv6: PseudoEthernetIpv6Settings | null;
  mirror: PseudoEthernetMirror | null;
  vif: PseudoEthernetVifConfig[];
  vif_s: PseudoEthernetVifSConfig[];
}

export interface PseudoEthernetConfigResponse {
  interfaces: PseudoEthernetInterface[];
  total: number;
}

export interface PseudoEthernetCapabilityFeature {
  supported: boolean;
  description: string;
}

export interface PseudoEthernetCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: Record<string, PseudoEthernetCapabilityFeature>;
  mode_values: string[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface PseudoEthernetBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// Input types
// ============================================================================

export interface PseudoEthernetDhcpOptionsInput {
  client_id?: string;
  host_name?: string;
  vendor_class_id?: string;
  user_class?: string;
  no_default_route?: boolean;
  default_route_distance?: string;
  reject?: string[];
  mtu?: boolean;
}

export interface PseudoEthernetDhcpv6PdInterfaceInput {
  name: string;
  address?: string;
  sla_id?: string;
}

export interface PseudoEthernetDhcpv6PdInstanceInput {
  instance: string;
  length?: string;
  interfaces?: PseudoEthernetDhcpv6PdInterfaceInput[];
}

export interface PseudoEthernetDhcpv6OptionsInput {
  duid?: string;
  no_release?: boolean;
  no_request_dns?: boolean;
  no_request_domain_name?: boolean;
  parameters_only?: boolean;
  rapid_commit?: boolean;
  temporary?: boolean;
  pd?: PseudoEthernetDhcpv6PdInstanceInput[];
}

export interface PseudoEthernetIpInput {
  adjust_mss?: string;
  adjust_mss_clamp_to_pmtu?: boolean;
  arp_cache_timeout?: string;
  disable_arp_filter?: boolean;
  enable_arp_accept?: boolean;
  enable_arp_announce?: boolean;
  enable_arp_ignore?: boolean;
  enable_directed_broadcast?: boolean;
  enable_proxy_arp?: boolean;
  proxy_arp_pvlan?: boolean;
  disable_forwarding?: boolean;
  source_validation?: string;
}

export interface PseudoEthernetIpv6Input {
  accept_dad?: string;
  adjust_mss?: string;
  adjust_mss_clamp_to_pmtu?: boolean;
  base_reachable_time?: string;
  disable_forwarding?: boolean;
  dup_addr_detect_transmits?: string;
  source_validation?: string;
  address_autoconf?: boolean;
  address_eui64?: string[];
  address_no_default_link_local?: boolean;
  address_interface_identifier?: string;
}

export interface PseudoEthernetVifInput {
  vlan_id: string;
  description?: string;
  disabled?: boolean;
  disable_link_detect?: boolean;
  addresses?: string[];
  mtu?: string;
  mac?: string;
  vrf?: string;
  redirect?: string;
  egress_qos?: string;
  ingress_qos?: string;
  dhcp_options?: PseudoEthernetDhcpOptionsInput;
  dhcpv6_options?: PseudoEthernetDhcpv6OptionsInput;
  ip?: PseudoEthernetIpInput;
  ipv6?: PseudoEthernetIpv6Input;
  mirror_ingress?: string;
  mirror_egress?: string;
}

export interface PseudoEthernetVifCInput {
  vlan_id: string;
  description?: string;
  disabled?: boolean;
  disable_link_detect?: boolean;
  addresses?: string[];
  mtu?: string;
  mac?: string;
  vrf?: string;
  redirect?: string;
  dhcp_options?: PseudoEthernetDhcpOptionsInput;
  dhcpv6_options?: PseudoEthernetDhcpv6OptionsInput;
  ip?: PseudoEthernetIpInput;
  ipv6?: PseudoEthernetIpv6Input;
  mirror_ingress?: string;
  mirror_egress?: string;
}

export interface PseudoEthernetVifSInput {
  vlan_id: string;
  description?: string;
  disabled?: boolean;
  disable_link_detect?: boolean;
  addresses?: string[];
  mtu?: string;
  mac?: string;
  vrf?: string;
  redirect?: string;
  dhcp_options?: PseudoEthernetDhcpOptionsInput;
  dhcpv6_options?: PseudoEthernetDhcpv6OptionsInput;
  ip?: PseudoEthernetIpInput;
  ipv6?: PseudoEthernetIpv6Input;
  mirror_ingress?: string;
  mirror_egress?: string;
  vif_c?: PseudoEthernetVifCInput[];
}

export interface PseudoEthernetCreateConfig {
  name: string;
  description?: string;
  disabled?: boolean;
  disable_link_detect?: boolean;
  source_interface?: string;
  mode?: string;
  mac?: string;
  mtu?: string;
  vrf?: string;
  redirect?: string;
  addresses?: string[];
  dhcp_options?: PseudoEthernetDhcpOptionsInput;
  dhcpv6_options?: PseudoEthernetDhcpv6OptionsInput;
  ip?: PseudoEthernetIpInput;
  ipv6?: PseudoEthernetIpv6Input;
  mirror_ingress?: string;
  mirror_egress?: string;
  vif?: PseudoEthernetVifInput[];
  vif_s?: PseudoEthernetVifSInput[];
}

// ============================================================================
// Operation builder helpers
// ============================================================================

function buildDhcpOps(
  prefix: string,
  dhcp: PseudoEthernetDhcpOptionsInput
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  if (dhcp.client_id) ops.push({ op: `${prefix}dhcp_options_client_id`, value: dhcp.client_id });
  if (dhcp.host_name) ops.push({ op: `${prefix}dhcp_options_host_name`, value: dhcp.host_name });
  if (dhcp.vendor_class_id) ops.push({ op: `${prefix}dhcp_options_vendor_class_id`, value: dhcp.vendor_class_id });
  if (dhcp.user_class) ops.push({ op: `${prefix}dhcp_options_user_class`, value: dhcp.user_class });
  if (dhcp.no_default_route) ops.push({ op: `${prefix}dhcp_options_no_default_route` });
  if (dhcp.default_route_distance) ops.push({ op: `${prefix}dhcp_options_default_route_distance`, value: dhcp.default_route_distance });
  for (const server of dhcp.reject ?? []) {
    ops.push({ op: `${prefix}dhcp_options_reject`, value: server });
  }
  if (dhcp.mtu) ops.push({ op: `${prefix}dhcp_options_mtu` });
  return ops;
}

function buildDhcpv6Ops(
  prefix: string,
  dhcpv6: PseudoEthernetDhcpv6OptionsInput
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  if (dhcpv6.duid) ops.push({ op: `${prefix}dhcpv6_options_duid`, value: dhcpv6.duid });
  if (dhcpv6.no_release) ops.push({ op: `${prefix}dhcpv6_options_no_release` });
  if (dhcpv6.no_request_dns) ops.push({ op: `${prefix}dhcpv6_options_no_request_dns` });
  if (dhcpv6.no_request_domain_name) ops.push({ op: `${prefix}dhcpv6_options_no_request_domain_name` });
  if (dhcpv6.parameters_only) ops.push({ op: `${prefix}dhcpv6_options_parameters_only` });
  if (dhcpv6.rapid_commit) ops.push({ op: `${prefix}dhcpv6_options_rapid_commit` });
  if (dhcpv6.temporary) ops.push({ op: `${prefix}dhcpv6_options_temporary` });

  for (const pd of dhcpv6.pd ?? []) {
    if (!pd.instance) continue;
    ops.push({ op: `${prefix}dhcpv6_options_pd_instance`, value: pd.instance });
    if (pd.length) {
      ops.push({ op: `${prefix}dhcpv6_options_pd_length`, value: `${pd.instance}:${pd.length}` });
    }
    for (const di of pd.interfaces ?? []) {
      if (!di.name) continue;
      ops.push({ op: `${prefix}dhcpv6_options_pd_interface`, value: `${pd.instance}:${di.name}` });
      if (di.address) {
        ops.push({ op: `${prefix}dhcpv6_options_pd_interface_address`, value: `${pd.instance}:${di.name}:${di.address}` });
      }
      if (di.sla_id) {
        ops.push({ op: `${prefix}dhcpv6_options_pd_interface_sla_id`, value: `${pd.instance}:${di.name}:${di.sla_id}` });
      }
    }
  }
  return ops;
}

function buildIpOps(
  prefix: string,
  ip: PseudoEthernetIpInput
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  if (ip.adjust_mss_clamp_to_pmtu) ops.push({ op: `${prefix}ip_adjust_mss_clamp_to_pmtu` });
  else if (ip.adjust_mss) ops.push({ op: `${prefix}ip_adjust_mss`, value: ip.adjust_mss });
  if (ip.arp_cache_timeout) ops.push({ op: `${prefix}ip_arp_cache_timeout`, value: ip.arp_cache_timeout });
  if (ip.disable_arp_filter) ops.push({ op: `${prefix}ip_disable_arp_filter` });
  if (ip.enable_arp_accept) ops.push({ op: `${prefix}ip_enable_arp_accept` });
  if (ip.enable_arp_announce) ops.push({ op: `${prefix}ip_enable_arp_announce` });
  if (ip.enable_arp_ignore) ops.push({ op: `${prefix}ip_enable_arp_ignore` });
  if (ip.enable_directed_broadcast) ops.push({ op: `${prefix}ip_enable_directed_broadcast` });
  if (ip.enable_proxy_arp) ops.push({ op: `${prefix}ip_enable_proxy_arp` });
  if (ip.proxy_arp_pvlan) ops.push({ op: `${prefix}ip_proxy_arp_pvlan` });
  if (ip.disable_forwarding) ops.push({ op: `${prefix}ip_disable_forwarding` });
  if (ip.source_validation) ops.push({ op: `${prefix}ip_source_validation`, value: ip.source_validation });
  return ops;
}

function buildIpv6Ops(
  prefix: string,
  ipv6: PseudoEthernetIpv6Input
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  if (ipv6.accept_dad) ops.push({ op: `${prefix}ipv6_accept_dad`, value: ipv6.accept_dad });
  if (ipv6.adjust_mss_clamp_to_pmtu) ops.push({ op: `${prefix}ipv6_adjust_mss_clamp_to_pmtu` });
  else if (ipv6.adjust_mss) ops.push({ op: `${prefix}ipv6_adjust_mss`, value: ipv6.adjust_mss });
  if (ipv6.base_reachable_time) ops.push({ op: `${prefix}ipv6_base_reachable_time`, value: ipv6.base_reachable_time });
  if (ipv6.disable_forwarding) ops.push({ op: `${prefix}ipv6_disable_forwarding` });
  if (ipv6.dup_addr_detect_transmits) ops.push({ op: `${prefix}ipv6_dup_addr_detect_transmits`, value: ipv6.dup_addr_detect_transmits });
  if (ipv6.source_validation) ops.push({ op: `${prefix}ipv6_source_validation`, value: ipv6.source_validation });
  if (ipv6.address_autoconf) ops.push({ op: `${prefix}ipv6_address_autoconf` });
  for (const prefix64 of ipv6.address_eui64 ?? []) {
    ops.push({ op: `${prefix}ipv6_address_eui64`, value: prefix64 });
  }
  if (ipv6.address_no_default_link_local) ops.push({ op: `${prefix}ipv6_address_no_default_link_local` });
  if (ipv6.address_interface_identifier) ops.push({ op: `${prefix}ipv6_address_interface_identifier`, value: ipv6.address_interface_identifier });
  return ops;
}

function buildVifOps(
  vif: PseudoEthernetVifInput
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  const v = vif.vlan_id;
  ops.push({ op: "set_vif", value: v });
  if (vif.description) ops.push({ op: "set_vif_description", value: `${v}:${vif.description}` });
  if (vif.disabled) ops.push({ op: "set_vif_disable", value: v });
  if (vif.disable_link_detect) ops.push({ op: "set_vif_disable_link_detect", value: v });
  for (const addr of vif.addresses ?? []) ops.push({ op: "set_vif_address", value: `${v}:${addr}` });
  if (vif.mtu) ops.push({ op: "set_vif_mtu", value: `${v}:${vif.mtu}` });
  if (vif.mac) ops.push({ op: "set_vif_mac", value: `${v}:${vif.mac}` });
  if (vif.vrf) ops.push({ op: "set_vif_vrf", value: `${v}:${vif.vrf}` });
  if (vif.redirect) ops.push({ op: "set_vif_redirect", value: `${v}:${vif.redirect}` });
  if (vif.egress_qos) ops.push({ op: "set_vif_egress_qos", value: `${v}:${vif.egress_qos}` });
  if (vif.ingress_qos) ops.push({ op: "set_vif_ingress_qos", value: `${v}:${vif.ingress_qos}` });
  if (vif.dhcp_options) {
    for (const dhcpOp of buildDhcpOps("set_vif_", vif.dhcp_options)) {
      ops.push({ op: dhcpOp.op, value: dhcpOp.value !== undefined ? `${v}:${dhcpOp.value}` : v });
    }
  }
  if (vif.dhcpv6_options) {
    for (const dhcpv6Op of buildDhcpv6Ops("set_vif_", vif.dhcpv6_options)) {
      ops.push({ op: dhcpv6Op.op, value: dhcpv6Op.value !== undefined ? `${v}:${dhcpv6Op.value}` : v });
    }
  }
  if (vif.ip) {
    for (const ipOp of buildIpOps("set_vif_", vif.ip)) {
      ops.push({ op: ipOp.op, value: ipOp.value !== undefined ? `${v}:${ipOp.value}` : v });
    }
  }
  if (vif.ipv6) {
    for (const ipv6Op of buildIpv6Ops("set_vif_", vif.ipv6)) {
      ops.push({ op: ipv6Op.op, value: ipv6Op.value !== undefined ? `${v}:${ipv6Op.value}` : v });
    }
  }
  if (vif.mirror_ingress) ops.push({ op: "set_vif_mirror_ingress", value: `${v}:${vif.mirror_ingress}` });
  if (vif.mirror_egress) ops.push({ op: "set_vif_mirror_egress", value: `${v}:${vif.mirror_egress}` });
  return ops;
}

function buildVifSOps(
  vifs: PseudoEthernetVifSInput
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];
  const sv = vifs.vlan_id;
  ops.push({ op: "set_vif_s", value: sv });
  if (vifs.description) ops.push({ op: "set_vif_s_description", value: `${sv}:${vifs.description}` });
  if (vifs.disabled) ops.push({ op: "set_vif_s_disable", value: sv });
  for (const addr of vifs.addresses ?? []) ops.push({ op: "set_vif_s_address", value: `${sv}:${addr}` });
  if (vifs.mtu) ops.push({ op: "set_vif_s_mtu", value: `${sv}:${vifs.mtu}` });
  if (vifs.mac) ops.push({ op: "set_vif_s_mac", value: `${sv}:${vifs.mac}` });
  if (vifs.vrf) ops.push({ op: "set_vif_s_vrf", value: `${sv}:${vifs.vrf}` });
  if (vifs.redirect) ops.push({ op: "set_vif_s_redirect", value: `${sv}:${vifs.redirect}` });
  if (vifs.mirror_ingress) ops.push({ op: "set_vif_s_mirror_ingress", value: `${sv}:${vifs.mirror_ingress}` });
  if (vifs.mirror_egress) ops.push({ op: "set_vif_s_mirror_egress", value: `${sv}:${vifs.mirror_egress}` });
  for (const vifc of vifs.vif_c ?? []) {
    const cv = vifc.vlan_id;
    ops.push({ op: "set_vif_c", value: `${sv}:${cv}` });
    if (vifc.description) ops.push({ op: "set_vif_c_description", value: `${sv}:${cv}:${vifc.description}` });
    if (vifc.disabled) ops.push({ op: "set_vif_c_disable", value: `${sv}:${cv}` });
    for (const addr of vifc.addresses ?? []) ops.push({ op: "set_vif_c_address", value: `${sv}:${cv}:${addr}` });
    if (vifc.mtu) ops.push({ op: "set_vif_c_mtu", value: `${sv}:${cv}:${vifc.mtu}` });
    if (vifc.mac) ops.push({ op: "set_vif_c_mac", value: `${sv}:${cv}:${vifc.mac}` });
    if (vifc.vrf) ops.push({ op: "set_vif_c_vrf", value: `${sv}:${cv}:${vifc.vrf}` });
    if (vifc.redirect) ops.push({ op: "set_vif_c_redirect", value: `${sv}:${cv}:${vifc.redirect}` });
    if (vifc.mirror_ingress) ops.push({ op: "set_vif_c_mirror_ingress", value: `${sv}:${cv}:${vifc.mirror_ingress}` });
    if (vifc.mirror_egress) ops.push({ op: "set_vif_c_mirror_egress", value: `${sv}:${cv}:${vifc.mirror_egress}` });
  }
  return ops;
}

function buildInterfaceOps(
  config: PseudoEthernetCreateConfig
): PseudoEthernetBatchOperation[] {
  const ops: PseudoEthernetBatchOperation[] = [];

  if (config.description) ops.push({ op: "set_description", value: config.description });
  if (config.disabled) ops.push({ op: "set_disable" });
  if (config.disable_link_detect) ops.push({ op: "set_disable_link_detect" });
  if (config.source_interface) ops.push({ op: "set_source_interface", value: config.source_interface });
  if (config.mode) ops.push({ op: "set_mode", value: config.mode });
  if (config.mac) ops.push({ op: "set_mac", value: config.mac });
  if (config.mtu) ops.push({ op: "set_mtu", value: config.mtu });
  if (config.vrf) ops.push({ op: "set_vrf", value: config.vrf });
  if (config.redirect) ops.push({ op: "set_redirect", value: config.redirect });

  for (const addr of config.addresses ?? []) {
    ops.push({ op: "set_address", value: addr });
  }

  if (config.dhcp_options) ops.push(...buildDhcpOps("set_", config.dhcp_options));
  if (config.dhcpv6_options) ops.push(...buildDhcpv6Ops("set_", config.dhcpv6_options));
  if (config.ip) ops.push(...buildIpOps("set_", config.ip));
  if (config.ipv6) ops.push(...buildIpv6Ops("set_", config.ipv6));

  if (config.mirror_ingress) ops.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
  if (config.mirror_egress) ops.push({ op: "set_mirror_egress", value: config.mirror_egress });

  for (const vif of config.vif ?? []) ops.push(...buildVifOps(vif));
  for (const vifs of config.vif_s ?? []) ops.push(...buildVifSOps(vifs));

  return ops;
}

// ============================================================================
// API Service
// ============================================================================

class PseudoEthernetService {
  async getCapabilities(): Promise<PseudoEthernetCapabilities> {
    return apiClient.get<PseudoEthernetCapabilities>("/vyos/pseudo-ethernet/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<PseudoEthernetConfigResponse> {
    return apiClient.get<PseudoEthernetConfigResponse>("/vyos/pseudo-ethernet/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: PseudoEthernetBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pseudo-ethernet/batch", {
      interface: interfaceName,
      operations,
    });
    if (result.success) {
      await this.refreshConfig();
    }
    return result;
  }

  async createInterface(config: PseudoEthernetCreateConfig): Promise<VyOSResponse> {
    const ops = buildInterfaceOps(config);
    return this.batchConfigure(config.name, ops);
  }

  async updateInterface(
    name: string,
    current: PseudoEthernetInterface,
    updated: Partial<PseudoEthernetCreateConfig>
  ): Promise<VyOSResponse> {
    const ops: PseudoEthernetBatchOperation[] = [];

    const setOrDeleteValue = (
      key: keyof Pick<PseudoEthernetCreateConfig, "description" | "source_interface" | "mode" | "mac" | "mtu" | "vrf" | "redirect" | "mirror_ingress" | "mirror_egress">,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      if (val) ops.push({ op: setOp, value: val as string });
      else ops.push({ op: deleteOp });
    };

    const setOrDeleteFlag = (
      key: keyof Pick<PseudoEthernetCreateConfig, "disabled" | "disable_link_detect">,
      setOp: string,
      deleteOp: string
    ) => {
      const val = updated[key];
      if (val === undefined) return;
      ops.push({ op: val ? setOp : deleteOp });
    };

    setOrDeleteValue("description", "set_description", "delete_description");
    setOrDeleteFlag("disabled", "set_disable", "delete_disable");
    setOrDeleteFlag("disable_link_detect", "set_disable_link_detect", "delete_disable_link_detect");
    setOrDeleteValue("source_interface", "set_source_interface", "delete_source_interface");
    setOrDeleteValue("mode", "set_mode", "delete_mode");
    setOrDeleteValue("mac", "set_mac", "delete_mac");
    setOrDeleteValue("mtu", "set_mtu", "delete_mtu");
    setOrDeleteValue("vrf", "set_vrf", "delete_vrf");
    setOrDeleteValue("redirect", "set_redirect", "delete_redirect");

    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_address", value: addr });
    }

    if (updated.dhcp_options !== undefined) {
      if (current.dhcp_options) ops.push({ op: "delete_dhcp_options" });
      ops.push(...buildDhcpOps("set_", updated.dhcp_options));
    }

    if (updated.dhcpv6_options !== undefined) {
      if (current.dhcpv6_options) ops.push({ op: "delete_dhcpv6_options" });
      ops.push(...buildDhcpv6Ops("set_", updated.dhcpv6_options));
    }

    if (updated.ip !== undefined) {
      const ip = updated.ip;
      if (ip.adjust_mss !== undefined || ip.adjust_mss_clamp_to_pmtu !== undefined) {
        if (current.ip?.adjust_mss) ops.push({ op: "delete_ip_adjust_mss" });
        if (ip.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ip_adjust_mss_clamp_to_pmtu" });
        else if (ip.adjust_mss) ops.push({ op: "set_ip_adjust_mss", value: ip.adjust_mss });
      }
      if (ip.arp_cache_timeout !== undefined) {
        if (ip.arp_cache_timeout) ops.push({ op: "set_ip_arp_cache_timeout", value: ip.arp_cache_timeout });
        else ops.push({ op: "delete_ip_arp_cache_timeout" });
      }
      const boolFlags: Array<[keyof PseudoEthernetIpInput, string, string]> = [
        ["disable_arp_filter", "set_ip_disable_arp_filter", "delete_ip_disable_arp_filter"],
        ["enable_arp_accept", "set_ip_enable_arp_accept", "delete_ip_enable_arp_accept"],
        ["enable_arp_announce", "set_ip_enable_arp_announce", "delete_ip_enable_arp_announce"],
        ["enable_arp_ignore", "set_ip_enable_arp_ignore", "delete_ip_enable_arp_ignore"],
        ["enable_directed_broadcast", "set_ip_enable_directed_broadcast", "delete_ip_enable_directed_broadcast"],
        ["enable_proxy_arp", "set_ip_enable_proxy_arp", "delete_ip_enable_proxy_arp"],
        ["proxy_arp_pvlan", "set_ip_proxy_arp_pvlan", "delete_ip_proxy_arp_pvlan"],
        ["disable_forwarding", "set_ip_disable_forwarding", "delete_ip_disable_forwarding"],
      ];
      for (const [k, setOp, delOp] of boolFlags) {
        if (ip[k] !== undefined) ops.push({ op: ip[k] ? setOp : delOp });
      }
      if (ip.source_validation !== undefined) {
        if (ip.source_validation) ops.push({ op: "set_ip_source_validation", value: ip.source_validation });
        else ops.push({ op: "delete_ip_source_validation" });
      }
    }

    if (updated.ipv6 !== undefined) {
      const ipv6 = updated.ipv6;
      if (ipv6.accept_dad !== undefined) {
        if (ipv6.accept_dad) ops.push({ op: "set_ipv6_accept_dad", value: ipv6.accept_dad });
        else ops.push({ op: "delete_ipv6_accept_dad" });
      }
      if (ipv6.adjust_mss !== undefined || ipv6.adjust_mss_clamp_to_pmtu !== undefined) {
        if (current.ipv6?.adjust_mss) ops.push({ op: "delete_ipv6_adjust_mss" });
        if (ipv6.adjust_mss_clamp_to_pmtu) ops.push({ op: "set_ipv6_adjust_mss_clamp_to_pmtu" });
        else if (ipv6.adjust_mss) ops.push({ op: "set_ipv6_adjust_mss", value: ipv6.adjust_mss });
      }
      if (ipv6.base_reachable_time !== undefined) {
        if (ipv6.base_reachable_time) ops.push({ op: "set_ipv6_base_reachable_time", value: ipv6.base_reachable_time });
        else ops.push({ op: "delete_ipv6_base_reachable_time" });
      }
      if (ipv6.disable_forwarding !== undefined) ops.push({ op: ipv6.disable_forwarding ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding" });
      if (ipv6.dup_addr_detect_transmits !== undefined) {
        if (ipv6.dup_addr_detect_transmits) ops.push({ op: "set_ipv6_dup_addr_detect_transmits", value: ipv6.dup_addr_detect_transmits });
        else ops.push({ op: "delete_ipv6_dup_addr_detect_transmits" });
      }
      if (ipv6.source_validation !== undefined) {
        if (ipv6.source_validation) ops.push({ op: "set_ipv6_source_validation", value: ipv6.source_validation });
        else ops.push({ op: "delete_ipv6_source_validation" });
      }
      if (ipv6.address_autoconf !== undefined) ops.push({ op: ipv6.address_autoconf ? "set_ipv6_address_autoconf" : "delete_ipv6_address_autoconf" });
      if (ipv6.address_eui64 !== undefined) {
        for (const old of current.ipv6?.address_eui64 ?? []) ops.push({ op: "delete_ipv6_address_eui64", value: old });
        for (const p of ipv6.address_eui64) ops.push({ op: "set_ipv6_address_eui64", value: p });
      }
      if (ipv6.address_no_default_link_local !== undefined) ops.push({ op: ipv6.address_no_default_link_local ? "set_ipv6_address_no_default_link_local" : "delete_ipv6_address_no_default_link_local" });
      if (ipv6.address_interface_identifier !== undefined) {
        if (ipv6.address_interface_identifier) ops.push({ op: "set_ipv6_address_interface_identifier", value: ipv6.address_interface_identifier });
        else ops.push({ op: "delete_ipv6_address_interface_identifier" });
      }
    }

    setOrDeleteValue("mirror_ingress", "set_mirror_ingress", "delete_mirror_ingress");
    setOrDeleteValue("mirror_egress", "set_mirror_egress", "delete_mirror_egress");

    if (updated.vif !== undefined) {
      for (const old of current.vif) ops.push({ op: "delete_vif", value: old.vlan_id });
      for (const vif of updated.vif) ops.push(...buildVifOps(vif));
    }

    if (updated.vif_s !== undefined) {
      for (const old of current.vif_s) ops.push({ op: "delete_vif_s", value: old.vlan_id });
      for (const vifs of updated.vif_s) ops.push(...buildVifSOps(vifs));
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes detected" } };
    }
    return this.batchConfigure(name, ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const pseudoEthernetService = new PseudoEthernetService();
