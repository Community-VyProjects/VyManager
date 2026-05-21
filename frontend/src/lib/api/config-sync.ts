import { apiClient } from "./client";

export interface ConfigSyncSecondary {
  address?: string | null;
  key?: string | null;
  port?: number | null;
  timeout?: number | null;
}

export interface ConfigSyncSections {
  firewall: boolean;
  nat: boolean;
  nat66: boolean;
  pki: boolean;
  policy: boolean;
  vpn: boolean;
  vrf: boolean;

  interfaces: boolean;
  interfaces_bonding: boolean;
  interfaces_bridge: boolean;
  interfaces_dummy: boolean;
  interfaces_ethernet: boolean;
  interfaces_geneve: boolean;
  interfaces_input: boolean;
  interfaces_l2tpv3: boolean;
  interfaces_loopback: boolean;
  interfaces_macsec: boolean;
  interfaces_openvpn: boolean;
  interfaces_pppoe: boolean;
  interfaces_pseudo_ethernet: boolean;
  interfaces_sstpc: boolean;
  interfaces_tunnel: boolean;
  interfaces_virtual_ethernet: boolean;
  interfaces_vti: boolean;
  interfaces_vxlan: boolean;
  interfaces_wireguard: boolean;
  interfaces_wireless: boolean;
  interfaces_wwan: boolean;

  protocols: boolean;
  protocols_babel: boolean;
  protocols_bfd: boolean;
  protocols_bgp: boolean;
  protocols_failover: boolean;
  protocols_igmp_proxy: boolean;
  protocols_isis: boolean;
  protocols_mpls: boolean;
  protocols_nhrp: boolean;
  protocols_ospf: boolean;
  protocols_ospfv3: boolean;
  protocols_pim: boolean;
  protocols_pim6: boolean;
  protocols_rip: boolean;
  protocols_ripng: boolean;
  protocols_rpki: boolean;
  protocols_segment_routing: boolean;
  protocols_static: boolean;

  qos: boolean;
  qos_interface: boolean;
  qos_policy: boolean;

  service: boolean;
  service_console_server: boolean;
  service_dhcp_relay: boolean;
  service_dhcp_server: boolean;
  service_dhcpv6_relay: boolean;
  service_dhcpv6_server: boolean;
  service_dns: boolean;
  service_lldp: boolean;
  service_mdns: boolean;
  service_monitoring: boolean;
  service_ndp_proxy: boolean;
  service_ntp: boolean;
  service_snmp: boolean;
  service_tftp_server: boolean;
  service_webproxy: boolean;

  system: boolean;
  system_conntrack: boolean;
  system_flow_accounting: boolean;
  system_login: boolean;
  system_option: boolean;
  system_sflow: boolean;
  system_static_host_mapping: boolean;
  system_sysctl: boolean;
  system_time_zone: boolean;
}

export interface ConfigSyncConfig {
  mode?: string | null;
  secondary?: ConfigSyncSecondary | null;
  sections: ConfigSyncSections;
}

export interface ConfigSyncCapabilities {
  version: string;
  features: Record<string, unknown>;
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export function defaultSections(): ConfigSyncSections {
  return {
    firewall: false, nat: false, nat66: false, pki: false, policy: false, vpn: false, vrf: false,
    interfaces: false, interfaces_bonding: false, interfaces_bridge: false, interfaces_dummy: false,
    interfaces_ethernet: false, interfaces_geneve: false, interfaces_input: false, interfaces_l2tpv3: false,
    interfaces_loopback: false, interfaces_macsec: false, interfaces_openvpn: false, interfaces_pppoe: false,
    interfaces_pseudo_ethernet: false, interfaces_sstpc: false, interfaces_tunnel: false,
    interfaces_virtual_ethernet: false, interfaces_vti: false, interfaces_vxlan: false,
    interfaces_wireguard: false, interfaces_wireless: false, interfaces_wwan: false,
    protocols: false, protocols_babel: false, protocols_bfd: false, protocols_bgp: false,
    protocols_failover: false, protocols_igmp_proxy: false, protocols_isis: false, protocols_mpls: false,
    protocols_nhrp: false, protocols_ospf: false, protocols_ospfv3: false, protocols_pim: false,
    protocols_pim6: false, protocols_rip: false, protocols_ripng: false, protocols_rpki: false,
    protocols_segment_routing: false, protocols_static: false,
    qos: false, qos_interface: false, qos_policy: false,
    service: false, service_console_server: false, service_dhcp_relay: false, service_dhcp_server: false,
    service_dhcpv6_relay: false, service_dhcpv6_server: false, service_dns: false, service_lldp: false,
    service_mdns: false, service_monitoring: false, service_ndp_proxy: false, service_ntp: false,
    service_snmp: false, service_tftp_server: false, service_webproxy: false,
    system: false, system_conntrack: false, system_flow_accounting: false, system_login: false,
    system_option: false, system_sflow: false, system_static_host_mapping: false, system_sysctl: false,
    system_time_zone: false,
  };
}

// Maps TypeScript field name → [parent, vyos-name] for sub-sections
const SUB_SECTION_MAP: Record<string, [string, string]> = {
  interfaces_bonding: ["interfaces", "bonding"],
  interfaces_bridge: ["interfaces", "bridge"],
  interfaces_dummy: ["interfaces", "dummy"],
  interfaces_ethernet: ["interfaces", "ethernet"],
  interfaces_geneve: ["interfaces", "geneve"],
  interfaces_input: ["interfaces", "input"],
  interfaces_l2tpv3: ["interfaces", "l2tpv3"],
  interfaces_loopback: ["interfaces", "loopback"],
  interfaces_macsec: ["interfaces", "macsec"],
  interfaces_openvpn: ["interfaces", "openvpn"],
  interfaces_pppoe: ["interfaces", "pppoe"],
  interfaces_pseudo_ethernet: ["interfaces", "pseudo-ethernet"],
  interfaces_sstpc: ["interfaces", "sstpc"],
  interfaces_tunnel: ["interfaces", "tunnel"],
  interfaces_virtual_ethernet: ["interfaces", "virtual-ethernet"],
  interfaces_vti: ["interfaces", "vti"],
  interfaces_vxlan: ["interfaces", "vxlan"],
  interfaces_wireguard: ["interfaces", "wireguard"],
  interfaces_wireless: ["interfaces", "wireless"],
  interfaces_wwan: ["interfaces", "wwan"],
  protocols_babel: ["protocols", "babel"],
  protocols_bfd: ["protocols", "bfd"],
  protocols_bgp: ["protocols", "bgp"],
  protocols_failover: ["protocols", "failover"],
  protocols_igmp_proxy: ["protocols", "igmp-proxy"],
  protocols_isis: ["protocols", "isis"],
  protocols_mpls: ["protocols", "mpls"],
  protocols_nhrp: ["protocols", "nhrp"],
  protocols_ospf: ["protocols", "ospf"],
  protocols_ospfv3: ["protocols", "ospfv3"],
  protocols_pim: ["protocols", "pim"],
  protocols_pim6: ["protocols", "pim6"],
  protocols_rip: ["protocols", "rip"],
  protocols_ripng: ["protocols", "ripng"],
  protocols_rpki: ["protocols", "rpki"],
  protocols_segment_routing: ["protocols", "segment-routing"],
  protocols_static: ["protocols", "static"],
  qos_interface: ["qos", "interface"],
  qos_policy: ["qos", "policy"],
  service_console_server: ["service", "console-server"],
  service_dhcp_relay: ["service", "dhcp-relay"],
  service_dhcp_server: ["service", "dhcp-server"],
  service_dhcpv6_relay: ["service", "dhcpv6-relay"],
  service_dhcpv6_server: ["service", "dhcpv6-server"],
  service_dns: ["service", "dns"],
  service_lldp: ["service", "lldp"],
  service_mdns: ["service", "mdns"],
  service_monitoring: ["service", "monitoring"],
  service_ndp_proxy: ["service", "ndp-proxy"],
  service_ntp: ["service", "ntp"],
  service_snmp: ["service", "snmp"],
  service_tftp_server: ["service", "tftp-server"],
  service_webproxy: ["service", "webproxy"],
  system_conntrack: ["system", "conntrack"],
  system_flow_accounting: ["system", "flow-accounting"],
  system_login: ["system", "login"],
  system_option: ["system", "option"],
  system_sflow: ["system", "sflow"],
  system_static_host_mapping: ["system", "static-host-mapping"],
  system_sysctl: ["system", "sysctl"],
  system_time_zone: ["system", "time-zone"],
};

const SIMPLE_SECTIONS = ["firewall", "nat", "nat66", "pki", "policy", "vpn", "vrf"] as const;
const PARENT_SECTIONS = ["interfaces", "protocols", "qos", "service", "system"] as const;

class ConfigSyncService {
  async getCapabilities(): Promise<ConfigSyncCapabilities> {
    return apiClient.get<ConfigSyncCapabilities>("/vyos/config-sync/capabilities");
  }

  async getConfig(refresh = false): Promise<ConfigSyncConfig> {
    return apiClient.get<ConfigSyncConfig>("/vyos/config-sync/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/config-sync/batch", { operations });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async saveConfig(original: ConfigSyncConfig | null, updated: ConfigSyncConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const orig = original ?? { mode: null, secondary: null, sections: defaultSections() };

    // Mode
    const oldMode = orig.mode ?? null;
    const newMode = updated.mode ?? null;
    if (oldMode !== newMode) {
      if (newMode) {
        ops.push({ op: "set_mode", value: newMode });
      } else {
        ops.push({ op: "delete_mode" });
      }
    }

    // Secondary fields
    const oldSec = orig.secondary ?? {};
    const newSec = updated.secondary ?? {};

    const secFields: Array<{ key: keyof ConfigSyncSecondary; setOp: string; delOp: string }> = [
      { key: "address", setOp: "set_secondary_address", delOp: "delete_secondary_address" },
      { key: "key", setOp: "set_secondary_key", delOp: "delete_secondary_key" },
      { key: "port", setOp: "set_secondary_port", delOp: "delete_secondary_port" },
      { key: "timeout", setOp: "set_secondary_timeout", delOp: "delete_secondary_timeout" },
    ];

    for (const { key, setOp, delOp } of secFields) {
      const oldVal = (oldSec as Record<string, unknown>)[key] ?? null;
      const newVal = (newSec as Record<string, unknown>)[key] ?? null;
      const oldStr = oldVal != null ? String(oldVal) : null;
      const newStr = newVal != null && String(newVal) !== "" ? String(newVal) : null;
      if (oldStr !== newStr) {
        if (newStr) {
          ops.push({ op: setOp, value: newStr });
        } else if (oldStr) {
          ops.push({ op: delOp });
        }
      }
    }

    // Simple sections
    const oldSections = orig.sections ?? defaultSections();
    const newSections = updated.sections ?? defaultSections();

    for (const name of SIMPLE_SECTIONS) {
      const wasOn = (oldSections as unknown as Record<string, boolean>)[name] ?? false;
      const isOn = (newSections as unknown as Record<string, boolean>)[name] ?? false;
      if (wasOn !== isOn) {
        ops.push({ op: isOn ? "set_section" : "delete_section", value: name });
      }
    }

    // Parent sections
    for (const name of PARENT_SECTIONS) {
      const wasOn = (oldSections as unknown as Record<string, boolean>)[name] ?? false;
      const isOn = (newSections as unknown as Record<string, boolean>)[name] ?? false;
      if (wasOn !== isOn) {
        ops.push({ op: isOn ? "set_section" : "delete_section", value: name });
      }
    }

    // Sub-sections
    for (const [field, [parent, vyosName]] of Object.entries(SUB_SECTION_MAP)) {
      const wasOn = (oldSections as unknown as Record<string, boolean>)[field] ?? false;
      const isOn = (newSections as unknown as Record<string, boolean>)[field] ?? false;
      if (wasOn !== isOn) {
        ops.push({ op: isOn ? "set_section_sub" : "delete_section_sub", value: `${parent},${vyosName}` });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batch(ops);
  }

  async deleteConfigSync(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_config_sync" }]);
  }
}

export const configSyncService = new ConfigSyncService();
