import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import { vxlanCreateOps, vxlanDeleteOps, vxlanUpdateOps, type VxlanForm } from "./vxlan-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VxlanIpSettings {
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

export interface VxlanIpv6Address {
  autoconf: boolean;
  eui64: string[];
  interface_identifier: string | null;
  no_default_link_local: boolean;
}

export interface VxlanIpv6Settings {
  accept_dad: string | null;
  address: VxlanIpv6Address;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface VxlanMirror {
  egress: string | null;
  ingress: string | null;
}

export interface VxlanParametersIp {
  df: string | null;
  tos: string | null;
  ttl: string | null;
}

export interface VxlanParametersIpv6 {
  flowlabel: string | null;
}

export interface VxlanParameters {
  external: boolean;
  ip: VxlanParametersIp;
  ipv6: VxlanParametersIpv6;
  neighbor_suppress: boolean;
  nolearning: boolean;
  vni_filter: boolean;
}

export interface VxlanVlanToVniEntry {
  vlan_id: string;
  vni: string | null;
  description: string | null;
}

export interface VxlanInterface {
  name: string;
  addresses: string[];
  description: string | null;
  disabled: boolean;
  gpe: boolean;
  group: string | null;
  ip: VxlanIpSettings;
  ipv6: VxlanIpv6Settings;
  mac: string | null;
  mirror: VxlanMirror;
  mtu: string | null;
  parameters: VxlanParameters;
  port: string | null;
  redirect: string | null;
  remotes: string[];
  source_address: string | null;
  source_interface: string | null;
  vlan_to_vni: VxlanVlanToVniEntry[];
  vni: string | null;
  vrf: string | null;
}

export interface VxlanConfigResponse {
  interfaces: VxlanInterface[];
  total: number;
}

export interface VxlanCapabilities {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
  instance_name?: string;
  instance_id?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface VxlanBatchOperation {
  op: string;
  value?: string;
}

const NO_CHANGES: VyOSResponse = { success: true };

// ============================================================================
// API Service
// ============================================================================

class VxlanService {
  async getCapabilities(): Promise<VxlanCapabilities> {
    return apiClient.get<VxlanCapabilities>("/vyos/vxlan/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<VxlanConfigResponse> {
    return apiClient.get<VxlanConfigResponse>("/vyos/vxlan/config", {
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
    operations: VxlanBatchOperation[]
  ): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/vxlan/batch", {
      interface_name: interfaceName,
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

  /** Create an interface from the form in one batch. */
  async createInterface(form: VxlanForm, caps: VxlanCapabilities | null): Promise<VyOSResponse> {
    return this.batchConfigure(form.name.trim(), vxlanCreateOps(form, caps));
  }

  /** Edit an interface: only the leaves the form changed are sent. */
  async updateInterface(
    original: VxlanInterface,
    form: VxlanForm,
    caps: VxlanCapabilities | null
  ): Promise<VyOSResponse> {
    return this.batchConfigure(original.name, vxlanUpdateOps(original, form, caps));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, vxlanDeleteOps());
  }
}

export const vxlanService = new VxlanService();
