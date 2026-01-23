/**
 * DNS Forwarding API Service
 * Handles all DNS forwarding related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface NameServer {
  address: string;
  port?: string;
}

export interface ForwardDomain {
  name: string;
  name_servers: string[];
  addnta: boolean;
  recursion_desired: boolean;
}

export interface DNSRecord {
  type: string;
  name: string;
  value?: string;
  priority?: string;
}

export interface AuthoritativeDomain {
  name: string;
  disable: boolean;
  records: DNSRecord[];
}

export interface DNSForwardingConfig {
  configured: boolean;
  listen_addresses: string[];
  allow_from: string[];
  name_servers: NameServer[];
  domains: ForwardDomain[];
  authoritative_domains: AuthoritativeDomain[];
  dhcp_interfaces: string[];
  cache_size?: string;
  negative_ttl?: string;
  timeout?: string;
  dnssec?: string;
  system: boolean;
  ignore_hosts_file: boolean;
  no_serve_rfc1918: boolean;
  source_address?: string;
}

export interface DNSCapabilities {
  dnssec_modes: { value: string; label: string; description: string }[];
  record_types: { value: string; label: string; description: string }[];
  defaults: {
    cache_size: number;
    negative_ttl: number;
    timeout: number;
  };
  limits: {
    cache_size_max: number;
    negative_ttl_max: number;
  };
  version: string;
}

export interface DNSOperation {
  op: string;
  address?: string;
  network?: string;
  domain?: string;
  server?: string;
  interface?: string;
  value?: string | number;
  name?: string;
  target?: string;
  priority?: string | number;
  port?: string | number;
}

export interface DNSBatchRequest {
  operations: DNSOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class DNSForwardingService {
  /**
   * Get DNS forwarding configuration
   */
  async getConfig(): Promise<DNSForwardingConfig> {
    return apiClient.get<DNSForwardingConfig>("/vyos/dns/config");
  }

  /**
   * Get DNS forwarding capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<DNSCapabilities> {
    return apiClient.get<DNSCapabilities>("/vyos/dns/capabilities");
  }

  /**
   * Get DNS forwarding statistics
   */
  async getStatistics(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/dns/statistics");
  }

  /**
   * Configure DNS forwarding using batch operations
   */
  async configureBatch(request: DNSBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dns/batch", request);
  }

  // =========================================================================
  // Listen & Access Control Helper Methods
  // =========================================================================

  /**
   * Add a listen address
   */
  async addListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_listen_address", address }],
    });
  }

  /**
   * Remove a listen address
   */
  async removeListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_listen_address", address }],
    });
  }

  /**
   * Add an allowed network
   */
  async addAllowFrom(network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_allow_from", network }],
    });
  }

  /**
   * Remove an allowed network
   */
  async removeAllowFrom(network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_allow_from", network }],
    });
  }

  // =========================================================================
  // Name Server Helper Methods
  // =========================================================================

  /**
   * Enable using system nameservers
   */
  async enableSystem(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_system" }],
    });
  }

  /**
   * Disable using system nameservers
   */
  async disableSystem(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_system" }],
    });
  }

  /**
   * Add a name server
   */
  async addNameServer(address: string, port?: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_name_server", address, port }],
    });
  }

  /**
   * Remove a name server
   */
  async removeNameServer(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_name_server", address }],
    });
  }

  /**
   * Add DHCP interface for DNS
   */
  async addDHCPInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_dhcp_interface", interface: interfaceName }],
    });
  }

  /**
   * Remove DHCP interface
   */
  async removeDHCPInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_dhcp_interface", interface: interfaceName }],
    });
  }

  // =========================================================================
  // Domain Forwarding Helper Methods
  // =========================================================================

  /**
   * Add domain-specific forwarding
   */
  async addDomain(domain: string, nameServers?: string[]): Promise<VyOSResponse> {
    const operations: DNSOperation[] = [{ op: "add_domain", domain }];

    if (nameServers) {
      for (const server of nameServers) {
        operations.push({ op: "add_domain_name_server", domain, server });
      }
    }

    return this.configureBatch({ operations });
  }

  /**
   * Remove domain-specific forwarding
   */
  async removeDomain(domain: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_domain", domain }],
    });
  }

  /**
   * Add name server to a domain
   */
  async addDomainNameServer(domain: string, server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_domain_name_server", domain, server }],
    });
  }

  /**
   * Remove name server from a domain
   */
  async removeDomainNameServer(domain: string, server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_domain_name_server", domain, server }],
    });
  }

  // =========================================================================
  // Cache & Performance Helper Methods
  // =========================================================================

  /**
   * Set cache size
   */
  async setCacheSize(size: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_cache_size", value: size }],
    });
  }

  /**
   * Set negative TTL
   */
  async setNegativeTTL(ttl: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_negative_ttl", value: ttl }],
    });
  }

  /**
   * Set query timeout
   */
  async setTimeout(timeout: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_timeout", value: timeout }],
    });
  }

  // =========================================================================
  // Security Helper Methods
  // =========================================================================

  /**
   * Set DNSSEC mode
   */
  async setDNSSEC(mode: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_dnssec", value: mode }],
    });
  }

  /**
   * Disable DNSSEC
   */
  async disableDNSSEC(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_dnssec" }],
    });
  }

  // =========================================================================
  // Authoritative Domain Helper Methods
  // =========================================================================

  /**
   * Create authoritative domain
   */
  async createAuthoritativeDomain(domain: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_authoritative_domain", domain }],
    });
  }

  /**
   * Delete authoritative domain
   */
  async deleteAuthoritativeDomain(domain: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_authoritative_domain", domain }],
    });
  }

  /**
   * Add A record to authoritative domain
   */
  async addARecord(domain: string, name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_a", domain, name, address }],
    });
  }

  /**
   * Delete A record from authoritative domain
   */
  async deleteARecord(domain: string, name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_a", domain, name, address }],
    });
  }

  /**
   * Add AAAA record to authoritative domain
   */
  async addAAAARecord(domain: string, name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_aaaa", domain, name, address }],
    });
  }

  /**
   * Delete AAAA record from authoritative domain
   */
  async deleteAAAARecord(domain: string, name: string, address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_aaaa", domain, name, address }],
    });
  }

  /**
   * Add CNAME record to authoritative domain
   */
  async addCNAMERecord(domain: string, name: string, target: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_cname", domain, name, target }],
    });
  }

  /**
   * Delete CNAME record from authoritative domain
   */
  async deleteCNAMERecord(domain: string, name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_cname", domain, name }],
    });
  }

  /**
   * Add MX record to authoritative domain
   */
  async addMXRecord(domain: string, name: string, server: string, priority: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_mx", domain, name, server, priority: String(priority) }],
    });
  }

  /**
   * Delete MX record from authoritative domain
   */
  async deleteMXRecord(domain: string, name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_mx", domain, name }],
    });
  }

  /**
   * Add TXT record to authoritative domain
   */
  async addTXTRecord(domain: string, name: string, value: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_txt", domain, name, value }],
    });
  }

  /**
   * Delete TXT record from authoritative domain
   */
  async deleteTXTRecord(domain: string, name: string, value: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_txt", domain, name, value }],
    });
  }

  /**
   * Add PTR record to authoritative domain
   */
  async addPTRRecord(domain: string, name: string, target: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_ptr", domain, name, target }],
    });
  }

  /**
   * Delete PTR record from authoritative domain
   */
  async deletePTRRecord(domain: string, name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_ptr", domain, name }],
    });
  }

  /**
   * Add NS record to authoritative domain
   */
  async addNSRecord(domain: string, name: string, target: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_record_ns", domain, name, target }],
    });
  }

  /**
   * Delete NS record from authoritative domain
   */
  async deleteNSRecord(domain: string, name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_record_ns", domain, name }],
    });
  }

  // =========================================================================
  // Quick Setup Helper
  // =========================================================================

  /**
   * Quick setup for basic DNS forwarding
   */
  async quickSetup(config: {
    listenAddresses: string[];
    allowFrom: string[];
    nameServers?: string[];
    useSystem?: boolean;
    cacheSize?: number;
    dnssec?: string;
  }): Promise<VyOSResponse> {
    const operations: DNSOperation[] = [];

    // Add listen addresses
    for (const address of config.listenAddresses) {
      operations.push({ op: "add_listen_address", address });
    }

    // Add allowed networks
    for (const network of config.allowFrom) {
      operations.push({ op: "add_allow_from", network });
    }

    // Add name servers or use system
    if (config.useSystem) {
      operations.push({ op: "enable_system" });
    } else if (config.nameServers) {
      for (const server of config.nameServers) {
        operations.push({ op: "add_name_server", address: server });
      }
    }

    // Set cache size
    if (config.cacheSize) {
      operations.push({ op: "set_cache_size", value: config.cacheSize });
    }

    // Set DNSSEC
    if (config.dnssec) {
      operations.push({ op: "set_dnssec", value: config.dnssec });
    }

    return this.configureBatch({ operations });
  }
}

export const dnsForwardingService = new DNSForwardingService();
