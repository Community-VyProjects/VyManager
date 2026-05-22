import { apiClient } from "./client";

export interface DHCPv6SubnetOptions {
  name_servers: string[];
  domain_search: string[];
  info_refresh_time: number | null;
  nis_domain: string | null;
  nisplus_domain: string | null;
  nis_servers: string[];
  nisplus_servers: string[];
  sip_servers: string[];
  sntp_servers: string[];
  cisco_tftp_servers: string[];
}

export interface DHCPv6AddressRange {
  range_id: string;
  start: string | null;
  stop: string | null;
  prefix: string | null;
  temporary: boolean;
}

export interface DHCPv6PrefixDelegation {
  prefix: string | null;
  delegated_length: number | null;
  prefix_length: number | null;
  excluded_prefix: string | null;
  excluded_prefix_length: number | null;
  start: string | null;
  stop: string | null;
}

export interface DHCPv6StaticMapping {
  name: string;
  disabled: boolean;
  duid: string | null;
  mac: string | null;
  ipv6_address: string | null;
  ipv6_prefix: string | null;
}

export interface DHCPv6Subnet {
  subnet: string;
  disabled: boolean;
  subnet_id: number | null;
  lease_default: number | null;
  lease_minimum: number | null;
  lease_maximum: number | null;
  options: DHCPv6SubnetOptions;
  address_ranges: DHCPv6AddressRange[];
  prefix_delegations: DHCPv6PrefixDelegation[];
  static_mappings: DHCPv6StaticMapping[];
}

export interface DHCPv6SharedNetwork {
  name: string;
  description: string | null;
  disabled: boolean;
  name_servers: string[];
  domain_search: string[];
  info_refresh_time: number | null;
  subnets: DHCPv6Subnet[];
}

export interface DHCPv6ServerConfig {
  disabled: boolean;
  disable_route_autoinstall: boolean;
  preference: number | null;
  global_name_servers: string[];
  listen_interfaces: string[];
  shared_networks: DHCPv6SharedNetwork[];
  total_subnets: number;
  total_static_mappings: number;
}

export interface DHCPv6ServerCapabilities {
  version: string;
  features: {
    disable: { supported: boolean; description: string };
    preference: { supported: boolean; description: string; min: number; max: number };
    global_name_servers: { supported: boolean; description: string };
    disable_route_autoinstall: { supported: boolean; description: string };
    listen_interface: { supported: boolean; description: string };
    shared_networks: { supported: boolean; description: string };
    network_common_options: { supported: boolean; description: string };
    subnet_lease_times: { supported: boolean; description: string };
    subnet_options: { supported: boolean; description: string };
    address_ranges_named: { supported: boolean; description: string };
    address_ranges_classic: { supported: boolean; description: string };
    prefix_delegation_v15: { supported: boolean; description: string };
    prefix_delegation_v14: { supported: boolean; description: string };
    static_mappings: { supported: boolean; description: string };
    static_mapping_duid: { supported: boolean; description: string };
    static_mapping_mac: { supported: boolean; description: string };
    subnet_id: { supported: boolean; description: string };
    vendor_options_cisco: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

interface BatchOperation {
  op: string;
  value?: string | null;
}

class DHCPv6ServerService {
  async getCapabilities(): Promise<DHCPv6ServerCapabilities> {
    return apiClient.get<DHCPv6ServerCapabilities>("/vyos/dhcpv6-server/capabilities");
  }

  async getConfig(refresh = false): Promise<DHCPv6ServerConfig> {
    return apiClient.get<DHCPv6ServerConfig>("/vyos/dhcpv6-server/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    try {
      return await apiClient.post<VyOSResponse>("/vyos/dhcpv6-server/batch", { operations });
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Request failed";
      return { success: false, error: message };
    }
  }

  async setDisabled(disabled: boolean): Promise<VyOSResponse> {
    return this.batch([{ op: disabled ? "set_disable" : "delete_disable" }]);
  }

  async saveGlobalSettings(
    original: DHCPv6ServerConfig,
    updated: Partial<DHCPv6ServerConfig>
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if ("disabled" in updated && updated.disabled !== original.disabled) {
      ops.push({ op: updated.disabled ? "set_disable" : "delete_disable" });
    }

    if ("preference" in updated) {
      if (updated.preference != null && updated.preference !== original.preference) {
        ops.push({ op: "set_preference", value: String(updated.preference) });
      } else if (updated.preference == null && original.preference != null) {
        ops.push({ op: "delete_preference" });
      }
    }

    if ("global_name_servers" in updated && updated.global_name_servers !== undefined) {
      this._diffList(
        ops,
        original.global_name_servers,
        updated.global_name_servers,
        (ns) => ({ op: "delete_global_name_server", value: ns }),
        (ns) => ({ op: "set_global_name_server", value: ns })
      );
    }

    if ("listen_interfaces" in updated && updated.listen_interfaces !== undefined) {
      this._diffList(
        ops,
        original.listen_interfaces,
        updated.listen_interfaces,
        (iface) => ({ op: "delete_listen_interface", value: iface }),
        (iface) => ({ op: "set_listen_interface", value: iface })
      );
    }

    if (
      "disable_route_autoinstall" in updated &&
      updated.disable_route_autoinstall !== original.disable_route_autoinstall
    ) {
      ops.push({
        op: updated.disable_route_autoinstall
          ? "set_disable_route_autoinstall"
          : "delete_disable_route_autoinstall",
      });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async saveSharedNetwork(
    original: DHCPv6SharedNetwork | null,
    updated: DHCPv6SharedNetwork
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = updated.name;

    if (original === null) {
      ops.push({ op: "set_shared_network", value: name });
      if (updated.description?.trim()) {
        ops.push({ op: "set_network_description", value: `${name},${updated.description.trim()}` });
      }
      if (updated.disabled) {
        ops.push({ op: "set_network_disable", value: name });
      }
      for (const ns of updated.name_servers) {
        ops.push({ op: "set_network_name_server", value: `${name},${ns}` });
      }
      for (const ds of updated.domain_search) {
        ops.push({ op: "set_network_domain_search", value: `${name},${ds}` });
      }
      if (updated.info_refresh_time != null) {
        ops.push({ op: "set_network_info_refresh_time", value: `${name},${updated.info_refresh_time}` });
      }
    } else {
      if (updated.description !== original.description) {
        if (updated.description?.trim()) {
          ops.push({ op: "set_network_description", value: `${name},${updated.description.trim()}` });
        } else {
          ops.push({ op: "delete_network_description", value: name });
        }
      }
      if (updated.disabled !== original.disabled) {
        ops.push({ op: updated.disabled ? "set_network_disable" : "delete_network_disable", value: name });
      }
      this._diffList(
        ops,
        original.name_servers,
        updated.name_servers,
        (ns) => ({ op: "delete_network_name_server", value: `${name},${ns}` }),
        (ns) => ({ op: "set_network_name_server", value: `${name},${ns}` })
      );
      this._diffList(
        ops,
        original.domain_search,
        updated.domain_search,
        (ds) => ({ op: "delete_network_domain_search", value: `${name},${ds}` }),
        (ds) => ({ op: "set_network_domain_search", value: `${name},${ds}` })
      );
      if (updated.info_refresh_time !== original.info_refresh_time) {
        if (updated.info_refresh_time != null) {
          ops.push({ op: "set_network_info_refresh_time", value: `${name},${updated.info_refresh_time}` });
        } else {
          ops.push({ op: "delete_network_info_refresh_time", value: name });
        }
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async createSharedNetworkWithSubnet(
    network: DHCPv6SharedNetwork,
    subnet: DHCPv6Subnet,
    range?: DHCPv6AddressRange,
    is15?: boolean
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = network.name;
    const subnetCidr = subnet.subnet;
    const base = `${name},${subnetCidr}`;

    // Network
    ops.push({ op: "set_shared_network", value: name });
    if (network.description?.trim()) ops.push({ op: "set_network_description", value: `${name},${network.description.trim()}` });
    if (network.disabled) ops.push({ op: "set_network_disable", value: name });
    for (const ns of network.name_servers) ops.push({ op: "set_network_name_server", value: `${name},${ns}` });
    for (const ds of network.domain_search) ops.push({ op: "set_network_domain_search", value: `${name},${ds}` });
    if (network.info_refresh_time != null) ops.push({ op: "set_network_info_refresh_time", value: `${name},${network.info_refresh_time}` });

    // Subnet
    ops.push({ op: "set_subnet", value: base });
    if (subnet.disabled) ops.push({ op: "set_subnet_disable", value: base });
    if (subnet.subnet_id != null) ops.push({ op: "set_subnet_id", value: `${base},${subnet.subnet_id}` });
    if (subnet.lease_default != null) ops.push({ op: "set_subnet_lease_default", value: `${base},${subnet.lease_default}` });
    if (subnet.lease_minimum != null) ops.push({ op: "set_subnet_lease_minimum", value: `${base},${subnet.lease_minimum}` });
    if (subnet.lease_maximum != null) ops.push({ op: "set_subnet_lease_maximum", value: `${base},${subnet.lease_maximum}` });
    for (const ns of subnet.options.name_servers) ops.push({ op: "set_subnet_name_server", value: `${base},${ns}` });
    for (const ds of subnet.options.domain_search) ops.push({ op: "set_subnet_domain_search", value: `${base},${ds}` });
    if (subnet.options.info_refresh_time != null) ops.push({ op: "set_subnet_info_refresh_time", value: `${base},${subnet.options.info_refresh_time}` });
    if (subnet.options.nis_domain) ops.push({ op: "set_subnet_nis_domain", value: `${base},${subnet.options.nis_domain}` });
    if (subnet.options.nisplus_domain) ops.push({ op: "set_subnet_nisplus_domain", value: `${base},${subnet.options.nisplus_domain}` });
    for (const s of subnet.options.nis_servers) ops.push({ op: "set_subnet_nis_server", value: `${base},${s}` });
    for (const s of subnet.options.nisplus_servers) ops.push({ op: "set_subnet_nisplus_server", value: `${base},${s}` });
    for (const s of subnet.options.sip_servers) ops.push({ op: "set_subnet_sip_server", value: `${base},${s}` });
    for (const s of subnet.options.sntp_servers) ops.push({ op: "set_subnet_sntp_server", value: `${base},${s}` });
    for (const s of subnet.options.cisco_tftp_servers) ops.push({ op: "set_subnet_cisco_tftp_server", value: `${base},${s}` });

    // Optional address range
    if (range) {
      if (is15) {
        ops.push({ op: "set_subnet_range", value: `${base},${range.range_id}` });
        if (range.start) ops.push({ op: "set_subnet_range_start", value: `${base},${range.range_id},${range.start}` });
        if (range.stop) ops.push({ op: "set_subnet_range_stop", value: `${base},${range.range_id},${range.stop}` });
        if (range.prefix) ops.push({ op: "set_subnet_range_prefix", value: `${base},${range.range_id},${range.prefix}` });
      } else {
        if (range.start && range.stop) {
          ops.push({ op: "set_subnet_addr_range_start_stop", value: `${base},${range.start},${range.stop}` });
        } else if (range.prefix) {
          ops.push({ op: range.temporary ? "set_subnet_addr_range_prefix_temporary" : "set_subnet_addr_range_prefix", value: `${base},${range.prefix}` });
        }
      }
    }

    return this.batch(ops);
  }

  async deleteSharedNetwork(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_shared_network", value: name }]);
  }

  async saveSubnet(
    netName: string,
    original: DHCPv6Subnet | null,
    updated: DHCPv6Subnet
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const subnet = updated.subnet;
    const base = `${netName},${subnet}`;

    if (original === null) {
      ops.push({ op: "set_subnet", value: base });
      if (updated.disabled) ops.push({ op: "set_subnet_disable", value: base });
      if (updated.subnet_id != null) ops.push({ op: "set_subnet_id", value: `${base},${updated.subnet_id}` });
      if (updated.lease_default != null) ops.push({ op: "set_subnet_lease_default", value: `${base},${updated.lease_default}` });
      if (updated.lease_minimum != null) ops.push({ op: "set_subnet_lease_minimum", value: `${base},${updated.lease_minimum}` });
      if (updated.lease_maximum != null) ops.push({ op: "set_subnet_lease_maximum", value: `${base},${updated.lease_maximum}` });
      for (const ns of updated.options.name_servers) ops.push({ op: "set_subnet_name_server", value: `${base},${ns}` });
      for (const ds of updated.options.domain_search) ops.push({ op: "set_subnet_domain_search", value: `${base},${ds}` });
      if (updated.options.info_refresh_time != null) ops.push({ op: "set_subnet_info_refresh_time", value: `${base},${updated.options.info_refresh_time}` });
      if (updated.options.nis_domain) ops.push({ op: "set_subnet_nis_domain", value: `${base},${updated.options.nis_domain}` });
      if (updated.options.nisplus_domain) ops.push({ op: "set_subnet_nisplus_domain", value: `${base},${updated.options.nisplus_domain}` });
      for (const s of updated.options.nis_servers) ops.push({ op: "set_subnet_nis_server", value: `${base},${s}` });
      for (const s of updated.options.nisplus_servers) ops.push({ op: "set_subnet_nisplus_server", value: `${base},${s}` });
      for (const s of updated.options.sip_servers) ops.push({ op: "set_subnet_sip_server", value: `${base},${s}` });
      for (const s of updated.options.sntp_servers) ops.push({ op: "set_subnet_sntp_server", value: `${base},${s}` });
      for (const s of updated.options.cisco_tftp_servers) ops.push({ op: "set_subnet_cisco_tftp_server", value: `${base},${s}` });
    } else {
      if (updated.disabled !== original.disabled) {
        ops.push({ op: updated.disabled ? "set_subnet_disable" : "delete_subnet_disable", value: base });
      }
      if (updated.subnet_id !== original.subnet_id) {
        if (updated.subnet_id != null) ops.push({ op: "set_subnet_id", value: `${base},${updated.subnet_id}` });
        else ops.push({ op: "delete_subnet_id", value: base });
      }
      if (updated.lease_default !== original.lease_default) {
        if (updated.lease_default != null) ops.push({ op: "set_subnet_lease_default", value: `${base},${updated.lease_default}` });
        else ops.push({ op: "delete_subnet_lease_default", value: base });
      }
      if (updated.lease_minimum !== original.lease_minimum) {
        if (updated.lease_minimum != null) ops.push({ op: "set_subnet_lease_minimum", value: `${base},${updated.lease_minimum}` });
        else ops.push({ op: "delete_subnet_lease_minimum", value: base });
      }
      if (updated.lease_maximum !== original.lease_maximum) {
        if (updated.lease_maximum != null) ops.push({ op: "set_subnet_lease_maximum", value: `${base},${updated.lease_maximum}` });
        else ops.push({ op: "delete_subnet_lease_maximum", value: base });
      }
      this._diffList(ops, original.options.name_servers, updated.options.name_servers,
        (ns) => ({ op: "delete_subnet_name_server", value: `${base},${ns}` }),
        (ns) => ({ op: "set_subnet_name_server", value: `${base},${ns}` }));
      this._diffList(ops, original.options.domain_search, updated.options.domain_search,
        (ds) => ({ op: "delete_subnet_domain_search", value: `${base},${ds}` }),
        (ds) => ({ op: "set_subnet_domain_search", value: `${base},${ds}` }));
      if (updated.options.info_refresh_time !== original.options.info_refresh_time) {
        if (updated.options.info_refresh_time != null) ops.push({ op: "set_subnet_info_refresh_time", value: `${base},${updated.options.info_refresh_time}` });
        else ops.push({ op: "delete_subnet_info_refresh_time", value: base });
      }
      if (updated.options.nis_domain !== original.options.nis_domain) {
        if (updated.options.nis_domain) ops.push({ op: "set_subnet_nis_domain", value: `${base},${updated.options.nis_domain}` });
        else ops.push({ op: "delete_subnet_nis_domain", value: base });
      }
      if (updated.options.nisplus_domain !== original.options.nisplus_domain) {
        if (updated.options.nisplus_domain) ops.push({ op: "set_subnet_nisplus_domain", value: `${base},${updated.options.nisplus_domain}` });
        else ops.push({ op: "delete_subnet_nisplus_domain", value: base });
      }
      this._diffList(ops, original.options.nis_servers, updated.options.nis_servers,
        (s) => ({ op: "delete_subnet_nis_server", value: `${base},${s}` }),
        (s) => ({ op: "set_subnet_nis_server", value: `${base},${s}` }));
      this._diffList(ops, original.options.nisplus_servers, updated.options.nisplus_servers,
        (s) => ({ op: "delete_subnet_nisplus_server", value: `${base},${s}` }),
        (s) => ({ op: "set_subnet_nisplus_server", value: `${base},${s}` }));
      this._diffList(ops, original.options.sip_servers, updated.options.sip_servers,
        (s) => ({ op: "delete_subnet_sip_server", value: `${base},${s}` }),
        (s) => ({ op: "set_subnet_sip_server", value: `${base},${s}` }));
      this._diffList(ops, original.options.sntp_servers, updated.options.sntp_servers,
        (s) => ({ op: "delete_subnet_sntp_server", value: `${base},${s}` }),
        (s) => ({ op: "set_subnet_sntp_server", value: `${base},${s}` }));
      this._diffList(ops, original.options.cisco_tftp_servers, updated.options.cisco_tftp_servers,
        (s) => ({ op: "delete_subnet_cisco_tftp_server", value: `${base},${s}` }),
        (s) => ({ op: "set_subnet_cisco_tftp_server", value: `${base},${s}` }));
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteSubnet(netName: string, subnet: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_subnet", value: `${netName},${subnet}` }]);
  }

  async saveAddressRange(
    netName: string,
    subnet: string,
    is15: boolean,
    original: DHCPv6AddressRange | null,
    updated: DHCPv6AddressRange
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const base = `${netName},${subnet}`;

    if (is15) {
      if (original !== null) {
        ops.push({ op: "delete_subnet_range", value: `${base},${original.range_id}` });
      }
      ops.push({ op: "set_subnet_range", value: `${base},${updated.range_id}` });
      if (updated.start) ops.push({ op: "set_subnet_range_start", value: `${base},${updated.range_id},${updated.start}` });
      if (updated.stop) ops.push({ op: "set_subnet_range_stop", value: `${base},${updated.range_id},${updated.stop}` });
      if (updated.prefix) ops.push({ op: "set_subnet_range_prefix", value: `${base},${updated.range_id},${updated.prefix}` });
    } else {
      if (original !== null) {
        if (original.start) ops.push({ op: "delete_subnet_addr_range_start", value: `${base},${original.start}` });
        else if (original.prefix) ops.push({ op: "delete_subnet_addr_range_prefix", value: `${base},${original.prefix}` });
      }
      if (updated.start && updated.stop) {
        ops.push({ op: "set_subnet_addr_range_start_stop", value: `${base},${updated.start},${updated.stop}` });
      } else if (updated.prefix) {
        if (updated.temporary) {
          ops.push({ op: "set_subnet_addr_range_prefix_temporary", value: `${base},${updated.prefix}` });
        } else {
          ops.push({ op: "set_subnet_addr_range_prefix", value: `${base},${updated.prefix}` });
        }
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteAddressRange(
    netName: string,
    subnet: string,
    is15: boolean,
    range: DHCPv6AddressRange
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const base = `${netName},${subnet}`;

    if (is15) {
      ops.push({ op: "delete_subnet_range", value: `${base},${range.range_id}` });
    } else {
      if (range.start) ops.push({ op: "delete_subnet_addr_range_start", value: `${base},${range.start}` });
      else if (range.prefix) ops.push({ op: "delete_subnet_addr_range_prefix", value: `${base},${range.prefix}` });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async savePrefixDelegation(
    netName: string,
    subnet: string,
    is15: boolean,
    original: DHCPv6PrefixDelegation | null,
    updated: DHCPv6PrefixDelegation
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const base = `${netName},${subnet}`;

    if (is15) {
      if (original?.prefix && original.prefix !== updated.prefix) {
        ops.push({ op: "delete_subnet_pd_prefix", value: `${base},${original.prefix}` });
      }
      if (updated.prefix) {
        ops.push({ op: "set_subnet_pd_prefix", value: `${base},${updated.prefix}` });
        if (updated.delegated_length != null) {
          ops.push({ op: "set_subnet_pd_prefix_delegated_length", value: `${base},${updated.prefix},${updated.delegated_length}` });
        }
        if (updated.prefix_length != null) {
          ops.push({ op: "set_subnet_pd_prefix_length", value: `${base},${updated.prefix},${updated.prefix_length}` });
        }
        if (updated.excluded_prefix) {
          ops.push({ op: "set_subnet_pd_prefix_excluded_prefix", value: `${base},${updated.prefix},${updated.excluded_prefix}` });
        }
        if (updated.excluded_prefix_length != null) {
          ops.push({ op: "set_subnet_pd_prefix_excluded_prefix_length", value: `${base},${updated.prefix},${updated.excluded_prefix_length}` });
        }
      }
    } else {
      if (original?.start && original.start !== updated.start) {
        ops.push({ op: "delete_subnet_pd_start", value: `${base},${original.start}` });
      }
      if (updated.start && updated.stop) {
        ops.push({ op: "set_subnet_pd_start_stop", value: `${base},${updated.start},${updated.stop}` });
        if (updated.prefix_length != null) {
          ops.push({ op: "set_subnet_pd_start_prefix_length", value: `${base},${updated.start},${updated.prefix_length}` });
        }
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deletePrefixDelegation(
    netName: string,
    subnet: string,
    is15: boolean,
    pd: DHCPv6PrefixDelegation
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const base = `${netName},${subnet}`;

    if (is15 && pd.prefix) {
      ops.push({ op: "delete_subnet_pd_prefix", value: `${base},${pd.prefix}` });
    } else if (!is15 && pd.start) {
      ops.push({ op: "delete_subnet_pd_start", value: `${base},${pd.start}` });
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async saveStaticMapping(
    netName: string,
    subnet: string,
    original: DHCPv6StaticMapping | null,
    updated: DHCPv6StaticMapping
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const mapping = updated.name;
    const base = `${netName},${subnet},${mapping}`;

    if (original === null) {
      ops.push({ op: "set_static_mapping", value: `${netName},${subnet},${mapping}` });
      if (updated.disabled) ops.push({ op: "set_static_mapping_disable", value: base });
      if (updated.duid) ops.push({ op: "set_static_mapping_duid", value: `${base},${updated.duid}` });
      if (updated.mac) ops.push({ op: "set_static_mapping_mac", value: `${base},${updated.mac}` });
      if (updated.ipv6_address) ops.push({ op: "set_static_mapping_ipv6_address", value: `${base},${updated.ipv6_address}` });
      if (updated.ipv6_prefix) ops.push({ op: "set_static_mapping_ipv6_prefix", value: `${base},${updated.ipv6_prefix}` });
    } else {
      if (updated.disabled !== original.disabled) {
        ops.push({ op: updated.disabled ? "set_static_mapping_disable" : "delete_static_mapping_disable", value: base });
      }
      if (updated.duid !== original.duid) {
        if (updated.duid) ops.push({ op: "set_static_mapping_duid", value: `${base},${updated.duid}` });
        else ops.push({ op: "delete_static_mapping_duid", value: base });
      }
      if (updated.mac !== original.mac) {
        if (updated.mac) ops.push({ op: "set_static_mapping_mac", value: `${base},${updated.mac}` });
        else ops.push({ op: "delete_static_mapping_mac", value: base });
      }
      if (updated.ipv6_address !== original.ipv6_address) {
        if (updated.ipv6_address) ops.push({ op: "set_static_mapping_ipv6_address", value: `${base},${updated.ipv6_address}` });
        else ops.push({ op: "delete_static_mapping_ipv6_address", value: base });
      }
      if (updated.ipv6_prefix !== original.ipv6_prefix) {
        if (updated.ipv6_prefix) ops.push({ op: "set_static_mapping_ipv6_prefix", value: `${base},${updated.ipv6_prefix}` });
        else ops.push({ op: "delete_static_mapping_ipv6_prefix", value: base });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteStaticMapping(netName: string, subnet: string, mappingName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_static_mapping", value: `${netName},${subnet},${mappingName}` }]);
  }

  private _diffList(
    ops: BatchOperation[],
    original: string[],
    updated: string[],
    delFn: (item: string) => BatchOperation,
    addFn: (item: string) => BatchOperation
  ): void {
    const origSet = new Set(original);
    const newSet = new Set(updated);
    for (const item of original) {
      if (!newSet.has(item)) ops.push(delFn(item));
    }
    for (const item of updated) {
      if (!origSet.has(item)) ops.push(addFn(item));
    }
  }
}

export const dhcpv6ServerService = new DHCPv6ServerService();
