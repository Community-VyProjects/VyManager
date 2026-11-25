import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import { macsecDeleteOps, macsecSaveOps, type MacsecDraft } from "./macsec-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MacsecMkaConfig {
  /** `***` when set: the config response never returns key material. */
  cak: string | null;
  ckn: string | null;
  priority: string | null;
}

export interface MacsecStaticPeer {
  name: string;
  /** `***` when set. */
  key: string | null;
  mac: string | null;
  disable: boolean;
}

export interface MacsecStaticConfig {
  /** `***` when set. */
  key: string | null;
  peers: MacsecStaticPeer[];
}

export interface MacsecSecurityConfig {
  cipher: string | null;
  encrypt: boolean;
  replay_window: string | null;
  /** Null when the `mka` node is absent; an object (maybe all null) when present. */
  mka: MacsecMkaConfig | null;
  /** Null when the `static` node is absent. */
  static: MacsecStaticConfig | null;
}

export interface MacsecIpSettings {
  adjust_mss: string | null;
  arp_cache_timeout: string | null;
  disable_arp_filter: boolean;
  disable_forwarding: boolean;
  enable_arp_accept: boolean;
  enable_arp_announce: boolean;
  enable_arp_ignore: boolean;
  enable_directed_broadcast: boolean;
  enable_proxy_arp: boolean;
  proxy_arp_pvlan: boolean;
  source_validation: string | null;
}

export interface MacsecIpv6Settings {
  accept_dad: string | null;
  address_autoconf: boolean;
  address_eui64: string[];
  address_no_default_link_local: boolean;
  address_interface_identifier: string | null;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface MacsecDhcpOptions {
  client_id: string | null;
  default_route_distance: string | null;
  host_name: string | null;
  mtu: boolean;
  no_default_route: boolean;
  reject: string[];
  user_class: string | null;
  vendor_class_id: string | null;
}

export interface MacsecDhcpv6PdInterface {
  address: string | null;
  sla_id: string | null;
}

export interface MacsecDhcpv6Pd {
  length: string | null;
  interfaces: Record<string, MacsecDhcpv6PdInterface>;
}

export interface MacsecDhcpv6Options {
  duid: string | null;
  no_release: boolean;
  no_request_dns: boolean;
  no_request_domain_name: boolean;
  parameters_only: boolean;
  rapid_commit: boolean;
  temporary: boolean;
  pd: Record<string, MacsecDhcpv6Pd>;
}

export interface MacsecInterface {
  name: string;
  type: string;
  addresses: string[];
  description: string | null;
  disabled: boolean;
  mtu: string | null;
  source_interface: string | null;
  vrf: string | null;
  security: MacsecSecurityConfig | null;
  ip: MacsecIpSettings | null;
  ipv6: MacsecIpv6Settings | null;
  /** Null when the `dhcp-options` node is absent. */
  dhcp_options: MacsecDhcpOptions | null;
  /** Null when the `dhcpv6-options` node is absent. */
  dhcpv6_options: MacsecDhcpv6Options | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  redirect: string | null;
}

export interface MacsecConfigResponse {
  interfaces: MacsecInterface[];
  total: number;
}

export interface MacsecCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  values: {
    cipher: string[];
    source_validation: string[];
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface MacsecBatchOperation {
  op: string;
  value?: string;
}

const NO_CHANGES: VyOSResponse = { success: true };

// ============================================================================
// API Service
// ============================================================================

class MacsecService {
  async getCapabilities(): Promise<MacsecCapabilities> {
    return apiClient.get<MacsecCapabilities>("/vyos/macsec/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<MacsecConfigResponse> {
    return apiClient.get<MacsecConfigResponse>("/vyos/macsec/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(
    interfaceName: string,
    operations: MacsecBatchOperation[]
  ): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/macsec/batch", {
      interface: interfaceName,
      operations,
    });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    // The commit landed; a failed cache refresh must not report it as failed.
    // The page reloads the config after every save anyway.
    try {
      await this.refreshConfig();
    } catch {
      // ignored on purpose
    }
    return result;
  }

  /** Create an interface from the draft in one batch. */
  async createInterface(draft: MacsecDraft, caps: MacsecCapabilities | null): Promise<VyOSResponse> {
    return this.batchConfigure(draft.name.trim(), macsecSaveOps(null, draft, caps));
  }

  /** Edit an interface: only the leaves the draft changed are sent. */
  async updateInterface(
    original: MacsecInterface,
    draft: MacsecDraft,
    caps: MacsecCapabilities | null
  ): Promise<VyOSResponse> {
    return this.batchConfigure(original.name, macsecSaveOps(original, draft, caps));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, macsecDeleteOps());
  }
}

export const macsecService = new MacsecService();
