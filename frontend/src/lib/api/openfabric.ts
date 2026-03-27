import { apiClient } from "./client";

// ============================================================================
// Response / Config Types
// ============================================================================

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface OpenfabricInterfaceConfig {
  name: string;
  address_family_ipv4: boolean;
  address_family_ipv6: boolean;
  csnp_interval: number | null;
  hello_interval: number | null;
  hello_multiplier: number | null;
  psnp_interval: number | null;
  metric: number | null;
  passive: boolean;
  password_type: string | null;
  password_value: string | null;
}

export interface OpenfabricDomainConfig {
  name: string;
  fabric_tier: number | null;
  log_adjacency_changes: boolean;
  purge_originator: boolean;
  set_overload_bit: boolean;
  lsp_gen_interval: number | null;
  lsp_refresh_interval: number | null;
  max_lsp_lifetime: number | null;
  spf_interval: number | null;
  domain_password_type: string | null;
  domain_password_value: string | null;
  interfaces: OpenfabricInterfaceConfig[];
}

export interface OpenfabricConfig {
  enabled: boolean;
  net: string | null;
  domains: OpenfabricDomainConfig[];
}

export interface OpenfabricCapabilities {
  version: string;
  features: {
    openfabric: { supported: boolean; description: string };
    domain: { supported: boolean; description: string };
    domain_password: { supported: boolean; description: string };
    interface_address_family: { supported: boolean; description: string };
    interface_password: { supported: boolean; description: string };
    fabric_tier: { supported: boolean; description: string };
  };
}

// ============================================================================
// Service
// ============================================================================

class OpenfabricService {
  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/openfabric/batch", { operations });
    if (!result.success) {
      throw new Error(result.error || "OpenFabric operation failed");
    }
    return result;
  }

  async getCapabilities(): Promise<OpenfabricCapabilities> {
    return apiClient.get<OpenfabricCapabilities>("/vyos/openfabric/capabilities");
  }

  async getConfig(refresh = false): Promise<OpenfabricConfig> {
    return apiClient.get<OpenfabricConfig>("/vyos/openfabric/config", {
      refresh: refresh.toString(),
    });
  }

  // -------------------------------------------------------------------------
  // NET
  // -------------------------------------------------------------------------

  async setNet(net: string): Promise<VyOSResponse> {
    return this.batch([{ op: "set_net", value: net }]);
  }

  async deleteNet(net: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_net", value: net }]);
  }

  // -------------------------------------------------------------------------
  // Domains
  // -------------------------------------------------------------------------

  async createDomain(domain: OpenfabricDomainConfig): Promise<VyOSResponse> {
    const ops = this.buildDomainOps(domain);
    return this.batch(ops);
  }

  async updateDomain(existing: OpenfabricDomainConfig, next: OpenfabricDomainConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_domain", value: existing.name }];
    ops.push(...this.buildDomainOps(next));
    return this.batch(ops);
  }

  async deleteDomain(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_domain", value: name }]);
  }

  private buildDomainOps(domain: OpenfabricDomainConfig): BatchOperation[] {
    const ops: BatchOperation[] = [];
    ops.push({ op: "set_domain", value: domain.name });

    if (domain.fabric_tier != null) {
      ops.push({ op: "set_domain_fabric_tier", value: `${domain.name},${domain.fabric_tier}` });
    }
    if (domain.log_adjacency_changes) {
      ops.push({ op: "set_domain_log_adjacency_changes", value: domain.name });
    }
    if (domain.purge_originator) {
      ops.push({ op: "set_domain_purge_originator", value: domain.name });
    }
    if (domain.set_overload_bit) {
      ops.push({ op: "set_domain_set_overload_bit", value: domain.name });
    }
    if (domain.lsp_gen_interval != null) {
      ops.push({ op: "set_domain_lsp_gen_interval", value: `${domain.name},${domain.lsp_gen_interval}` });
    }
    if (domain.lsp_refresh_interval != null) {
      ops.push({ op: "set_domain_lsp_refresh_interval", value: `${domain.name},${domain.lsp_refresh_interval}` });
    }
    if (domain.max_lsp_lifetime != null) {
      ops.push({ op: "set_domain_max_lsp_lifetime", value: `${domain.name},${domain.max_lsp_lifetime}` });
    }
    if (domain.spf_interval != null) {
      ops.push({ op: "set_domain_spf_interval", value: `${domain.name},${domain.spf_interval}` });
    }

    // Domain password
    if (domain.domain_password_type === "md5" && domain.domain_password_value) {
      ops.push({ op: "set_domain_password_md5", value: `${domain.name},${domain.domain_password_value}` });
    } else if (domain.domain_password_type === "plaintext" && domain.domain_password_value) {
      ops.push({ op: "set_domain_password_plaintext", value: `${domain.name},${domain.domain_password_value}` });
    }

    // Interfaces
    for (const iface of domain.interfaces) {
      ops.push(...this.buildInterfaceOps(domain.name, iface));
    }

    return ops;
  }

  // -------------------------------------------------------------------------
  // Interfaces
  // -------------------------------------------------------------------------

  async createInterface(domain: string, iface: OpenfabricInterfaceConfig): Promise<VyOSResponse> {
    return this.batch(this.buildInterfaceOps(domain, iface));
  }

  async updateInterface(domain: string, existingName: string, iface: OpenfabricInterfaceConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_domain_interface", value: `${domain},${existingName}` }];
    ops.push(...this.buildInterfaceOps(domain, iface));
    return this.batch(ops);
  }

  async deleteInterface(domain: string, ifaceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_domain_interface", value: `${domain},${ifaceName}` }]);
  }

  private buildInterfaceOps(domain: string, iface: OpenfabricInterfaceConfig): BatchOperation[] {
    const ops: BatchOperation[] = [];
    ops.push({ op: "set_domain_interface", value: `${domain},${iface.name}` });

    if (iface.address_family_ipv4) {
      ops.push({ op: "set_domain_interface_address_family_ipv4", value: `${domain},${iface.name}` });
    }
    if (iface.address_family_ipv6) {
      ops.push({ op: "set_domain_interface_address_family_ipv6", value: `${domain},${iface.name}` });
    }
    if (iface.csnp_interval != null) {
      ops.push({ op: "set_domain_interface_csnp_interval", value: `${domain},${iface.name},${iface.csnp_interval}` });
    }
    if (iface.hello_interval != null) {
      ops.push({ op: "set_domain_interface_hello_interval", value: `${domain},${iface.name},${iface.hello_interval}` });
    }
    if (iface.hello_multiplier != null) {
      ops.push({ op: "set_domain_interface_hello_multiplier", value: `${domain},${iface.name},${iface.hello_multiplier}` });
    }
    if (iface.psnp_interval != null) {
      ops.push({ op: "set_domain_interface_psnp_interval", value: `${domain},${iface.name},${iface.psnp_interval}` });
    }
    if (iface.metric != null) {
      ops.push({ op: "set_domain_interface_metric", value: `${domain},${iface.name},${iface.metric}` });
    }
    if (iface.passive) {
      ops.push({ op: "set_domain_interface_passive", value: `${domain},${iface.name}` });
    }

    // Interface password
    if (iface.password_type === "md5" && iface.password_value) {
      ops.push({ op: "set_domain_interface_password_md5", value: `${domain},${iface.name},${iface.password_value}` });
    } else if (iface.password_type === "plaintext" && iface.password_value) {
      ops.push({ op: "set_domain_interface_password_plaintext", value: `${domain},${iface.name},${iface.password_value}` });
    }

    return ops;
  }
}

export const openfabricService = new OpenfabricService();
