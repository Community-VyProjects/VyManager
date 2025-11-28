import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DHCPRange {
  range_id: string;
  start?: string;
  stop?: string;
}

export interface DHCPStaticMapping {
  name: string;
  ip_address?: string;
  mac_address?: string;
  disable: boolean;
}

export interface DHCPSubnet {
  subnet: string;
  subnet_id?: number;
  default_router?: string;
  name_servers: string[];
  domain_name?: string;
  domain_search: string[];
  lease?: string;
  ranges: DHCPRange[];
  excludes: string[];
  static_mappings: DHCPStaticMapping[];
  ping_check: boolean;
  enable_failover: boolean;
  bootfile_name?: string;
  bootfile_server?: string;
  tftp_server_name?: string;
  time_servers: string[];
  ntp_servers: string[];
  wins_servers: string[];
  time_offset?: string;
  client_prefix_length?: string;
  wpad_url?: string;
}

export interface DHCPSharedNetwork {
  name: string;
  authoritative: boolean;
  name_servers: string[];
  domain_name?: string;
  domain_search: string[];
  ping_check: boolean;
  subnets: DHCPSubnet[];
}

export interface DHCPFailoverConfig {
  mode?: string;
  name?: string;
  source_address?: string;
  remote?: string;
  status?: string;
}

export interface DHCPGlobalConfig {
  listen_addresses: string[];
  hostfile_update: boolean;
  host_decl_name: boolean;
}

export interface DHCPConfigResponse {
  shared_networks: DHCPSharedNetwork[];
  failover?: DHCPFailoverConfig;
  global_config: DHCPGlobalConfig;
  total_subnets: number;
  total_static_mappings: number;
}

export interface DHCPLease {
  ip_address: string;
  mac_address: string;
  state: string;
  lease_start: string;
  lease_expiration: string;
  remaining: string;
  pool: string;
  hostname?: string;
  origin: string;
}

export interface DHCPLeasesResponse {
  leases: DHCPLease[];
  total: number;
}

interface DHCPFieldCapability {
  supported: boolean;
  description: string;
}

export interface DHCPCapabilitiesResponse {
  version: string;
  has_subnet_id: boolean;
  fields: {
    // Basic fields
    subnet: DHCPFieldCapability;
    subnet_id: DHCPFieldCapability;
    default_router: DHCPFieldCapability;
    domain_name: DHCPFieldCapability;
    lease: DHCPFieldCapability;
    // DNS fields
    name_servers: DHCPFieldCapability;
    domain_search: DHCPFieldCapability;
    // Pool fields
    ranges: DHCPFieldCapability;
    excludes: DHCPFieldCapability;
    // Advanced options - Boot/PXE
    bootfile_name: DHCPFieldCapability;
    bootfile_server: DHCPFieldCapability;
    tftp_server_name: DHCPFieldCapability;
    // Advanced options - Time/NTP
    time_servers: DHCPFieldCapability;
    ntp_servers: DHCPFieldCapability;
    time_offset: DHCPFieldCapability;
    // Advanced options - Windows/WINS
    wins_servers: DHCPFieldCapability;
    // Advanced options - Other
    client_prefix_length: DHCPFieldCapability;
    wpad_url: DHCPFieldCapability;
    // Options
    ping_check: DHCPFieldCapability;
    enable_failover: DHCPFieldCapability;
  };
  version_notes: {
    subnet_id_required: boolean;
    option_prefix: boolean;
    subnet_failover_removed: boolean;
    time_offset_requires_option_prefix: boolean;
  };
  device_name?: string;
}

export interface DHCPBatchOperation {
  op: string;
  value?: string;
}

export interface DHCPBatchRequest {
  network_name: string;
  subnet?: string;
  operations: DHCPBatchOperation[];
}

export interface CreateSubnetConfig {
  network_name: string;
  subnet: string;
  subnet_id?: number;
  default_router: string;
  name_servers: string[];
  domain_name: string;
  lease: string;
  ranges: DHCPRange[];
  excludes?: string[];
  domain_search?: string[];
  ping_check?: boolean;
  enable_failover?: boolean;
  bootfile_name?: string;
  bootfile_server?: string;
  tftp_server_name?: string;
  time_servers?: string[];
  ntp_servers?: string[];
  wins_servers?: string[];
  time_offset?: string;
  client_prefix_length?: string;
  wpad_url?: string;
}

export interface UpdateSubnetConfig {
  network_name: string;
  subnet: string;
  subnet_id?: number;
  default_router?: string;
  name_servers?: string[];
  domain_name?: string;
  lease?: string;
  ranges?: DHCPRange[];
  excludes?: string[];
  domain_search?: string[];
  ping_check?: boolean;
  enable_failover?: boolean;
  bootfile_name?: string;
  bootfile_server?: string;
  tftp_server_name?: string;
  time_servers?: string[];
  ntp_servers?: string[];
  wins_servers?: string[];
  time_offset?: string;
  client_prefix_length?: string;
  wpad_url?: string;
  delete_default_router?: boolean;
  delete_domain_name?: boolean;
  delete_lease?: boolean;
  delete_bootfile_name?: boolean;
  delete_bootfile_server?: boolean;
  delete_tftp_server_name?: boolean;
  delete_time_offset?: boolean;
  delete_client_prefix_length?: boolean;
  delete_wpad_url?: boolean;
  delete_ping_check?: boolean;
  delete_enable_failover?: boolean;
}

// ============================================================================
// API Service
// ============================================================================

class DHCPService {
  /**
   * Get DHCP server capabilities based on VyOS version
   */
  async getCapabilities(): Promise<DHCPCapabilitiesResponse> {
    return apiClient.get<DHCPCapabilitiesResponse>("/vyos/dhcp/capabilities");
  }

  /**
   * Get all DHCP configurations
   */
  async getConfig(refresh: boolean = false): Promise<DHCPConfigResponse> {
    return apiClient.get<DHCPConfigResponse>("/vyos/dhcp/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Get active DHCP leases
   */
  async getLeases(): Promise<DHCPLeasesResponse> {
    return apiClient.get<DHCPLeasesResponse>("/vyos/dhcp/leases");
  }

  /**
   * Refresh the cached configuration from VyOS device
   */
  async refreshConfig(): Promise<any> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Execute batch DHCP operations
   */
  async batchConfigure(request: DHCPBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/dhcp/batch", request);
    // Refresh config cache after successful commit
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a new DHCP subnet with all required settings
   */
  async createSubnet(config: CreateSubnetConfig): Promise<any> {
    const operations: DHCPBatchOperation[] = [];

    // Create shared network if it doesn't exist (idempotent operation)
    operations.push({ op: "set_shared_network" });

    // Create subnet
    operations.push({ op: "set_subnet" });

    // Set subnet-id (if required by version)
    if (config.subnet_id !== undefined) {
      operations.push({
        op: "set_subnet_subnet_id",
        value: config.subnet_id.toString(),
      });
    }

    // Set default router (required)
    operations.push({
      op: "set_subnet_default_router",
      value: config.default_router,
    });

    // Set name servers (required, can be multiple)
    for (const ns of config.name_servers) {
      operations.push({ op: "set_subnet_name_server", value: ns });
    }

    // Set domain name (required)
    operations.push({ op: "set_subnet_domain_name", value: config.domain_name });

    // Set lease time (required)
    operations.push({ op: "set_subnet_lease", value: config.lease });

    // Set ranges (required, at least one)
    for (const range of config.ranges) {
      operations.push({ op: "set_subnet_range", value: range.range_id });
      if (range.start) {
        operations.push({
          op: "set_subnet_range_start",
          value: `${range.range_id}|${range.start}`,
        });
      }
      if (range.stop) {
        operations.push({
          op: "set_subnet_range_stop",
          value: `${range.range_id}|${range.stop}`,
        });
      }
    }

    // Optional: excludes
    if (config.excludes) {
      for (const exclude of config.excludes) {
        operations.push({ op: "set_subnet_exclude", value: exclude });
      }
    }

    // Optional: domain search
    if (config.domain_search) {
      for (const ds of config.domain_search) {
        operations.push({ op: "set_subnet_domain_search", value: ds });
      }
    }

    // Optional: ping check
    if (config.ping_check) {
      operations.push({ op: "set_subnet_ping_check" });
    }

    // Optional: failover
    if (config.enable_failover) {
      operations.push({ op: "set_subnet_enable_failover" });
    }

    // Optional: advanced options
    if (config.bootfile_name) {
      operations.push({ op: "set_subnet_bootfile_name", value: config.bootfile_name });
    }
    if (config.bootfile_server) {
      operations.push({
        op: "set_subnet_bootfile_server",
        value: config.bootfile_server,
      });
    }
    if (config.tftp_server_name) {
      operations.push({
        op: "set_subnet_tftp_server_name",
        value: config.tftp_server_name,
      });
    }
    if (config.time_servers) {
      for (const ts of config.time_servers) {
        operations.push({ op: "set_subnet_time_server", value: ts });
      }
    }
    if (config.ntp_servers) {
      for (const ntp of config.ntp_servers) {
        operations.push({ op: "set_subnet_ntp_server", value: ntp });
      }
    }
    if (config.wins_servers) {
      for (const wins of config.wins_servers) {
        operations.push({ op: "set_subnet_wins_server", value: wins });
      }
    }
    if (config.time_offset) {
      operations.push({ op: "set_subnet_time_offset", value: config.time_offset });
    }
    if (config.client_prefix_length) {
      operations.push({
        op: "set_subnet_client_prefix_length",
        value: config.client_prefix_length,
      });
    }
    if (config.wpad_url) {
      operations.push({ op: "set_subnet_wpad_url", value: config.wpad_url });
    }

    return this.batchConfigure({
      network_name: config.network_name,
      subnet: config.subnet,
      operations,
    });
  }

  /**
   * Update an existing DHCP subnet
   */
  async updateSubnet(config: UpdateSubnetConfig): Promise<any> {
    const operations: DHCPBatchOperation[] = [];

    // First, fetch current config to know what needs to be deleted
    const currentConfig = await this.getConfig();
    const currentSubnet = currentConfig.shared_networks
      .find(n => n.name === config.network_name)
      ?.subnets.find(s => s.subnet === config.subnet);

    // Update subnet-id if provided
    if (config.subnet_id !== undefined) {
      operations.push({
        op: "set_subnet_subnet_id",
        value: config.subnet_id.toString(),
      });
    }

    // Update default router
    if (config.delete_default_router) {
      operations.push({ op: "delete_subnet_default_router" });
    } else if (config.default_router) {
      operations.push({
        op: "set_subnet_default_router",
        value: config.default_router,
      });
    }

    // Update name servers (delete old ones, then set new ones)
    if (config.name_servers !== undefined) {
      // Delete existing name servers
      if (currentSubnet?.name_servers) {
        for (const ns of currentSubnet.name_servers) {
          operations.push({ op: "delete_subnet_name_server", value: ns });
        }
      }
      // Set new name servers
      for (const ns of config.name_servers) {
        operations.push({ op: "set_subnet_name_server", value: ns });
      }
    }

    // Update domain name
    if (config.delete_domain_name) {
      operations.push({ op: "delete_subnet_domain_name" });
    } else if (config.domain_name) {
      operations.push({ op: "set_subnet_domain_name", value: config.domain_name });
    }

    // Update lease time
    if (config.delete_lease) {
      operations.push({ op: "delete_subnet_lease" });
    } else if (config.lease) {
      operations.push({ op: "set_subnet_lease", value: config.lease });
    }

    // Update ranges (delete old ones, then set new ones)
    if (config.ranges !== undefined) {
      // Delete existing ranges
      if (currentSubnet?.ranges) {
        for (const range of currentSubnet.ranges) {
          operations.push({ op: "delete_subnet_range", value: range.range_id });
        }
      }
      // Set new ranges
      for (const range of config.ranges) {
        operations.push({ op: "set_subnet_range", value: range.range_id });
        if (range.start) {
          operations.push({
            op: "set_subnet_range_start",
            value: `${range.range_id}|${range.start}`,
          });
        }
        if (range.stop) {
          operations.push({
            op: "set_subnet_range_stop",
            value: `${range.range_id}|${range.stop}`,
          });
        }
      }
    }

    // Update excludes (delete old ones, then set new ones)
    if (config.excludes !== undefined) {
      // Delete existing excludes
      if (currentSubnet?.excludes) {
        for (const exclude of currentSubnet.excludes) {
          operations.push({ op: "delete_subnet_exclude", value: exclude });
        }
      }
      // Set new excludes
      for (const exclude of config.excludes) {
        operations.push({ op: "set_subnet_exclude", value: exclude });
      }
    }

    // Update domain search (delete old ones, then set new ones)
    if (config.domain_search !== undefined) {
      // Delete existing domain search entries
      if (currentSubnet?.domain_search) {
        for (const ds of currentSubnet.domain_search) {
          operations.push({ op: "delete_subnet_domain_search", value: ds });
        }
      }
      // Set new domain search entries
      for (const ds of config.domain_search) {
        operations.push({ op: "set_subnet_domain_search", value: ds });
      }
    }

    // Update time servers (delete old ones, then set new ones)
    if (config.time_servers !== undefined) {
      // Delete existing time servers
      if (currentSubnet?.time_servers) {
        for (const ts of currentSubnet.time_servers) {
          operations.push({ op: "delete_subnet_time_server", value: ts });
        }
      }
      // Set new time servers
      for (const ts of config.time_servers) {
        operations.push({ op: "set_subnet_time_server", value: ts });
      }
    }

    // Update NTP servers (delete old ones, then set new ones)
    if (config.ntp_servers !== undefined) {
      // Delete existing NTP servers
      if (currentSubnet?.ntp_servers) {
        for (const ntp of currentSubnet.ntp_servers) {
          operations.push({ op: "delete_subnet_ntp_server", value: ntp });
        }
      }
      // Set new NTP servers
      for (const ntp of config.ntp_servers) {
        operations.push({ op: "set_subnet_ntp_server", value: ntp });
      }
    }

    // Update WINS servers (delete old ones, then set new ones)
    if (config.wins_servers !== undefined) {
      // Delete existing WINS servers
      if (currentSubnet?.wins_servers) {
        for (const wins of currentSubnet.wins_servers) {
          operations.push({ op: "delete_subnet_wins_server", value: wins });
        }
      }
      // Set new WINS servers
      for (const wins of config.wins_servers) {
        operations.push({ op: "set_subnet_wins_server", value: wins });
      }
    }

    // Update ping check
    if (config.delete_ping_check) {
      operations.push({ op: "delete_subnet_ping_check" });
    } else if (config.ping_check) {
      operations.push({ op: "set_subnet_ping_check" });
    }

    // Update failover
    if (config.delete_enable_failover) {
      operations.push({ op: "delete_subnet_enable_failover" });
    } else if (config.enable_failover) {
      operations.push({ op: "set_subnet_enable_failover" });
    }

    // Update advanced options
    if (config.delete_bootfile_name) {
      operations.push({ op: "delete_subnet_bootfile_name" });
    } else if (config.bootfile_name) {
      operations.push({ op: "set_subnet_bootfile_name", value: config.bootfile_name });
    }

    if (config.delete_bootfile_server) {
      operations.push({ op: "delete_subnet_bootfile_server" });
    } else if (config.bootfile_server) {
      operations.push({
        op: "set_subnet_bootfile_server",
        value: config.bootfile_server,
      });
    }

    if (config.delete_tftp_server_name) {
      operations.push({ op: "delete_subnet_tftp_server_name" });
    } else if (config.tftp_server_name) {
      operations.push({
        op: "set_subnet_tftp_server_name",
        value: config.tftp_server_name,
      });
    }

    if (config.delete_time_offset) {
      operations.push({ op: "delete_subnet_time_offset" });
    } else if (config.time_offset) {
      operations.push({ op: "set_subnet_time_offset", value: config.time_offset });
    }

    if (config.delete_client_prefix_length) {
      operations.push({ op: "delete_subnet_client_prefix_length" });
    } else if (config.client_prefix_length) {
      operations.push({
        op: "set_subnet_client_prefix_length",
        value: config.client_prefix_length,
      });
    }

    if (config.delete_wpad_url) {
      operations.push({ op: "delete_subnet_wpad_url" });
    } else if (config.wpad_url) {
      operations.push({ op: "set_subnet_wpad_url", value: config.wpad_url });
    }

    return this.batchConfigure({
      network_name: config.network_name,
      subnet: config.subnet,
      operations,
    });
  }

  /**
   * Delete a DHCP subnet
   */
  async deleteSubnet(network_name: string, subnet: string): Promise<any> {
    const operations: DHCPBatchOperation[] = [{ op: "delete_subnet" }];

    return this.batchConfigure({
      network_name,
      subnet,
      operations,
    });
  }

  /**
   * Delete a shared network (and all its subnets)
   */
  async deleteSharedNetwork(network_name: string): Promise<any> {
    const operations: DHCPBatchOperation[] = [{ op: "delete_shared_network" }];

    return this.batchConfigure({
      network_name,
      operations,
    });
  }

  /**
   * Create a static mapping
   */
  async createStaticMapping(
    network_name: string,
    subnet: string,
    mapping_name: string,
    ip_address: string,
    mac_address: string
  ): Promise<any> {
    const operations: DHCPBatchOperation[] = [
      { op: "set_static_mapping", value: mapping_name },
      {
        op: "set_static_mapping_ip_address",
        value: `${mapping_name}|${ip_address}`,
      },
      {
        op: "set_static_mapping_mac_address",
        value: `${mapping_name}|${mac_address}`,
      },
    ];

    return this.batchConfigure({
      network_name,
      subnet,
      operations,
    });
  }

  /**
   * Delete a static mapping
   */
  async deleteStaticMapping(
    network_name: string,
    subnet: string,
    mapping_name: string
  ): Promise<any> {
    const operations: DHCPBatchOperation[] = [
      { op: "delete_static_mapping", value: mapping_name },
    ];

    return this.batchConfigure({
      network_name,
      subnet,
      operations,
    });
  }
}

export const dhcpService = new DHCPService();
