import { apiClient } from "./client";

export interface NdpProxyPrefix {
  prefix: string;
  disabled: boolean;
  mode: string | null;
  interface: string | null;
}

export interface NdpProxyInterface {
  name: string;
  disabled: boolean;
  enable_router_bit: boolean;
  timeout: number | null;
  ttl: number | null;
  prefixes: NdpProxyPrefix[];
}

export interface NdpProxyConfig {
  route_refresh: number | null;
  interfaces: NdpProxyInterface[];
}

export interface NdpProxyCapabilities {
  version: string;
  features: {
    ndp_proxy: { supported: boolean; description: string };
    route_refresh: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    interface_disable: { supported: boolean; description: string };
    interface_enable_router_bit: { supported: boolean; description: string };
    interface_timeout: { supported: boolean; description: string };
    interface_ttl: { supported: boolean; description: string };
    prefix: { supported: boolean; description: string };
    prefix_disable: { supported: boolean; description: string };
    prefix_mode: { supported: boolean; description: string };
    prefix_interface: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface NdpProxyBatchGroup {
  interface?: string | null;
  prefix?: string | null;
  operations: BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

class NdpProxyService {
  async getCapabilities(): Promise<NdpProxyCapabilities> {
    return apiClient.get<NdpProxyCapabilities>("/vyos/ndp-proxy/capabilities");
  }

  async getConfig(refresh = false): Promise<NdpProxyConfig> {
    return apiClient.get<NdpProxyConfig>("/vyos/ndp-proxy/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(groups: NdpProxyBatchGroup[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ndp-proxy/batch", { groups });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async setGlobal(
    original: NdpProxyConfig,
    routeRefresh: string | null
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const trimmed = routeRefresh?.trim() ?? "";
    const newVal = trimmed !== "" ? parseInt(trimmed, 10) : null;
    const oldVal = original.route_refresh;

    if (newVal !== oldVal) {
      if (newVal !== null) {
        ops.push({ op: "set_route_refresh", value: String(newVal) });
      } else {
        ops.push({ op: "delete_route_refresh" });
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch([{ interface: null, prefix: null, operations: ops }]);
  }

  async setInterface(
    original: NdpProxyInterface | null,
    updated: NdpProxyInterface
  ): Promise<VyOSResponse> {
    const groups: NdpProxyBatchGroup[] = [];
    const name = updated.name;
    const isCreate = original === null;
    const ifaceOps: BatchOperation[] = [];

    if (isCreate) {
      ifaceOps.push({ op: "set_interface" });
    }

    const wasDisabled = original?.disabled ?? false;
    if (isCreate || updated.disabled !== wasDisabled) {
      if (updated.disabled) {
        ifaceOps.push({ op: "set_interface_disable" });
      } else if (!isCreate && wasDisabled) {
        ifaceOps.push({ op: "delete_interface_disable" });
      }
    }

    const wasRouterBit = original?.enable_router_bit ?? false;
    if (isCreate || updated.enable_router_bit !== wasRouterBit) {
      if (updated.enable_router_bit) {
        ifaceOps.push({ op: "set_interface_enable_router_bit" });
      } else if (!isCreate && wasRouterBit) {
        ifaceOps.push({ op: "delete_interface_enable_router_bit" });
      }
    }

    const oldTimeout = original?.timeout ?? null;
    if (isCreate || updated.timeout !== oldTimeout) {
      if (updated.timeout !== null) {
        ifaceOps.push({ op: "set_interface_timeout", value: String(updated.timeout) });
      } else if (!isCreate && oldTimeout !== null) {
        ifaceOps.push({ op: "delete_interface_timeout" });
      }
    }

    const oldTtl = original?.ttl ?? null;
    if (isCreate || updated.ttl !== oldTtl) {
      if (updated.ttl !== null) {
        ifaceOps.push({ op: "set_interface_ttl", value: String(updated.ttl) });
      } else if (!isCreate && oldTtl !== null) {
        ifaceOps.push({ op: "delete_interface_ttl" });
      }
    }

    if (ifaceOps.length > 0) {
      groups.push({ interface: name, prefix: null, operations: ifaceOps });
    }

    const oldPrefixes = original?.prefixes ?? [];
    const newPrefixes = updated.prefixes;

    for (const oldP of oldPrefixes) {
      if (!newPrefixes.find((p) => p.prefix === oldP.prefix)) {
        groups.push({
          interface: name,
          prefix: oldP.prefix,
          operations: [{ op: "delete_prefix" }],
        });
      }
    }

    for (const newP of newPrefixes) {
      const oldP = oldPrefixes.find((p) => p.prefix === newP.prefix);
      const prefixOps: BatchOperation[] = [];

      if (!oldP) {
        prefixOps.push({ op: "set_prefix" });
      }

      const wasDisabledP = oldP?.disabled ?? false;
      if (!oldP || newP.disabled !== wasDisabledP) {
        if (newP.disabled) {
          prefixOps.push({ op: "set_prefix_disable" });
        } else if (oldP && wasDisabledP) {
          prefixOps.push({ op: "delete_prefix_disable" });
        }
      }

      const oldMode = oldP?.mode ?? null;
      const newMode = newP.mode || null;
      if (!oldP || newMode !== oldMode) {
        if (newMode && newMode !== "static") {
          prefixOps.push({ op: "set_prefix_mode", value: newMode });
        } else if (oldP && oldMode && oldMode !== "static") {
          prefixOps.push({ op: "delete_prefix_mode" });
        }
      }

      const oldIface = oldP?.interface ?? null;
      const newIface = newMode === "interface" ? (newP.interface || null) : null;
      if (!oldP || newIface !== oldIface) {
        if (newIface) {
          prefixOps.push({ op: "set_prefix_interface", value: newIface });
        } else if (oldP && oldIface) {
          prefixOps.push({ op: "delete_prefix_interface" });
        }
      }

      if (prefixOps.length > 0) {
        groups.push({ interface: name, prefix: newP.prefix, operations: prefixOps });
      }
    }

    if (groups.length === 0) return { success: true };
    return this.batch(groups);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([
      { interface: name, prefix: null, operations: [{ op: "delete_interface" }] },
    ]);
  }
}

export const ndpProxyService = new NdpProxyService();
