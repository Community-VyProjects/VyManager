import { apiClient } from "./client";

export interface RAPrefix {
  prefix: string;
  base_interface: string | null;
  decrement_lifetime: boolean;
  deprecate_prefix: boolean;
  no_autonomous_flag: boolean;
  no_on_link_flag: boolean;
  preferred_lifetime: string | null;
  valid_lifetime: string | null;
}

export interface NAT64Prefix {
  prefix: string;
  valid_lifetime: string | null;
}

export interface RARoute {
  route: string;
  no_remove_route: boolean;
  route_preference: string | null;
  valid_lifetime: string | null;
}

export interface RouterAdvertInterface {
  name: string;
  auto_ignore: string[];
  captive_portal: string | null;
  default_lifetime: string | null;
  default_preference: string | null;
  dnssl: string[];
  hop_limit: number | null;
  interval_max: number | null;
  interval_min: number | null;
  link_mtu: number | null;
  managed_flag: boolean;
  name_server: string[];
  name_server_lifetime: number | null;
  nat64_prefixes: NAT64Prefix[];
  no_send_advert: boolean;
  no_send_interval: boolean;
  other_config_flag: boolean;
  prefixes: RAPrefix[];
  reachable_time: number | null;
  retrans_timer: number | null;
  routes: RARoute[];
  source_address: string[];
}

export interface RouterAdvertConfig {
  interfaces: RouterAdvertInterface[];
}

export interface RouterAdvertCapabilities {
  version: string;
  features: {
    interface: { supported: boolean; description: string };
    auto_ignore: { supported: boolean; description: string };
    captive_portal: { supported: boolean; description: string };
    default_lifetime: { supported: boolean; description: string };
    default_preference: { supported: boolean; description: string };
    dnssl: { supported: boolean; description: string };
    hop_limit: { supported: boolean; description: string };
    interval_max: { supported: boolean; description: string };
    interval_min: { supported: boolean; description: string };
    link_mtu: { supported: boolean; description: string };
    managed_flag: { supported: boolean; description: string };
    name_server: { supported: boolean; description: string };
    name_server_lifetime: { supported: boolean; description: string };
    nat64prefix: { supported: boolean; description: string };
    nat64prefix_valid_lifetime: { supported: boolean; description: string };
    no_send_advert: { supported: boolean; description: string };
    no_send_interval: { supported: boolean; description: string };
    other_config_flag: { supported: boolean; description: string };
    prefix: { supported: boolean; description: string };
    prefix_base_interface: { supported: boolean; description: string };
    prefix_decrement_lifetime: { supported: boolean; description: string };
    prefix_deprecate_prefix: { supported: boolean; description: string };
    prefix_no_autonomous_flag: { supported: boolean; description: string };
    prefix_no_on_link_flag: { supported: boolean; description: string };
    prefix_preferred_lifetime: { supported: boolean; description: string };
    prefix_valid_lifetime: { supported: boolean; description: string };
    reachable_time: { supported: boolean; description: string };
    retrans_timer: { supported: boolean; description: string };
    route: { supported: boolean; description: string };
    route_no_remove_route: { supported: boolean; description: string };
    route_preference: { supported: boolean; description: string };
    route_valid_lifetime: { supported: boolean; description: string };
    source_address: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface RouterAdvertBatchGroup {
  interface?: string | null;
  prefix?: string | null;
  nat64prefix?: string | null;
  route?: string | null;
  operations: BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

class RouterAdvertService {
  async getCapabilities(): Promise<RouterAdvertCapabilities> {
    return apiClient.get<RouterAdvertCapabilities>("/vyos/router-advert/capabilities");
  }

  async getConfig(refresh = false): Promise<RouterAdvertConfig> {
    return apiClient.get<RouterAdvertConfig>("/vyos/router-advert/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(groups: RouterAdvertBatchGroup[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/router-advert/batch", { groups });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async setInterface(
    original: RouterAdvertInterface | null,
    updated: RouterAdvertInterface
  ): Promise<VyOSResponse> {
    const groups: RouterAdvertBatchGroup[] = [];
    const name = updated.name;
    const isCreate = original === null;
    const ifaceOps: BatchOperation[] = [];

    if (isCreate) {
      ifaceOps.push({ op: "set_interface" });
    }

    // Scalar string fields
    const scalarStr: Array<{
      key: keyof RouterAdvertInterface;
      setOp: string;
      delOp: string;
    }> = [
      { key: "default_lifetime", setOp: "set_interface_default_lifetime", delOp: "delete_interface_default_lifetime" },
      { key: "default_preference", setOp: "set_interface_default_preference", delOp: "delete_interface_default_preference" },
      { key: "captive_portal", setOp: "set_interface_captive_portal", delOp: "delete_interface_captive_portal" },
    ];

    for (const { key, setOp, delOp } of scalarStr) {
      const oldVal = (original?.[key] as string | null) ?? null;
      const newVal = (updated[key] as string | null) ?? null;
      if (isCreate || newVal !== oldVal) {
        if (newVal) {
          ifaceOps.push({ op: setOp, value: newVal });
        } else if (!isCreate && oldVal) {
          ifaceOps.push({ op: delOp });
        }
      }
    }

    // Scalar number fields
    const scalarNum: Array<{
      key: keyof RouterAdvertInterface;
      setOp: string;
      delOp: string;
    }> = [
      { key: "hop_limit", setOp: "set_interface_hop_limit", delOp: "delete_interface_hop_limit" },
      { key: "link_mtu", setOp: "set_interface_link_mtu", delOp: "delete_interface_link_mtu" },
      { key: "reachable_time", setOp: "set_interface_reachable_time", delOp: "delete_interface_reachable_time" },
      { key: "retrans_timer", setOp: "set_interface_retrans_timer", delOp: "delete_interface_retrans_timer" },
      { key: "interval_max", setOp: "set_interface_interval_max", delOp: "delete_interface_interval_max" },
      { key: "interval_min", setOp: "set_interface_interval_min", delOp: "delete_interface_interval_min" },
      { key: "name_server_lifetime", setOp: "set_interface_name_server_lifetime", delOp: "delete_interface_name_server_lifetime" },
    ];

    for (const { key, setOp, delOp } of scalarNum) {
      const oldVal = (original?.[key] as number | null) ?? null;
      const newVal = (updated[key] as number | null) ?? null;
      if (isCreate || newVal !== oldVal) {
        if (newVal !== null) {
          ifaceOps.push({ op: setOp, value: String(newVal) });
        } else if (!isCreate && oldVal !== null) {
          ifaceOps.push({ op: delOp });
        }
      }
    }

    // Presence flags
    const flags: Array<{
      key: keyof RouterAdvertInterface;
      setOp: string;
      delOp: string;
    }> = [
      { key: "managed_flag", setOp: "set_interface_managed_flag", delOp: "delete_interface_managed_flag" },
      { key: "other_config_flag", setOp: "set_interface_other_config_flag", delOp: "delete_interface_other_config_flag" },
      { key: "no_send_advert", setOp: "set_interface_no_send_advert", delOp: "delete_interface_no_send_advert" },
      { key: "no_send_interval", setOp: "set_interface_no_send_interval", delOp: "delete_interface_no_send_interval" },
    ];

    for (const { key, setOp, delOp } of flags) {
      const wasSet = (original?.[key] as boolean) ?? false;
      const isSet = updated[key] as boolean;
      if (isCreate || isSet !== wasSet) {
        if (isSet) {
          ifaceOps.push({ op: setOp });
        } else if (!isCreate && wasSet) {
          ifaceOps.push({ op: delOp });
        }
      }
    }

    // Multi-value list fields
    const listFields: Array<{
      key: keyof RouterAdvertInterface;
      setOp: string;
      delOp: string;
    }> = [
      { key: "name_server", setOp: "set_interface_name_server", delOp: "delete_interface_name_server" },
      { key: "dnssl", setOp: "set_interface_dnssl", delOp: "delete_interface_dnssl" },
      { key: "source_address", setOp: "set_interface_source_address", delOp: "delete_interface_source_address" },
      { key: "auto_ignore", setOp: "set_interface_auto_ignore", delOp: "delete_interface_auto_ignore" },
    ];

    for (const { key, setOp, delOp } of listFields) {
      const oldList = (original?.[key] as string[]) ?? [];
      const newList = updated[key] as string[];
      for (const item of oldList) {
        if (!newList.includes(item)) {
          ifaceOps.push({ op: delOp, value: item });
        }
      }
      for (const item of newList) {
        if (!oldList.includes(item)) {
          ifaceOps.push({ op: setOp, value: item });
        }
      }
    }

    if (ifaceOps.length > 0) {
      groups.push({ interface: name, operations: ifaceOps });
    }

    // Prefixes
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
      const oldP = oldPrefixes.find((p) => p.prefix === newP.prefix) ?? null;
      const prefixOps: BatchOperation[] = [];

      if (!oldP) {
        prefixOps.push({ op: "set_prefix" });
      }

      if (!oldP || newP.base_interface !== (oldP.base_interface ?? null)) {
        if (newP.base_interface) {
          prefixOps.push({ op: "set_prefix_base_interface", value: newP.base_interface });
        } else if (oldP?.base_interface) {
          prefixOps.push({ op: "delete_prefix_base_interface" });
        }
      }

      if (!oldP || newP.preferred_lifetime !== (oldP.preferred_lifetime ?? null)) {
        if (newP.preferred_lifetime) {
          prefixOps.push({ op: "set_prefix_preferred_lifetime", value: newP.preferred_lifetime });
        } else if (oldP?.preferred_lifetime) {
          prefixOps.push({ op: "delete_prefix_preferred_lifetime" });
        }
      }

      if (!oldP || newP.valid_lifetime !== (oldP.valid_lifetime ?? null)) {
        if (newP.valid_lifetime) {
          prefixOps.push({ op: "set_prefix_valid_lifetime", value: newP.valid_lifetime });
        } else if (oldP?.valid_lifetime) {
          prefixOps.push({ op: "delete_prefix_valid_lifetime" });
        }
      }

      const boolPrefixFlags: Array<{
        key: keyof RAPrefix;
        setOp: string;
        delOp: string;
      }> = [
        { key: "decrement_lifetime", setOp: "set_prefix_decrement_lifetime", delOp: "delete_prefix_decrement_lifetime" },
        { key: "deprecate_prefix", setOp: "set_prefix_deprecate_prefix", delOp: "delete_prefix_deprecate_prefix" },
        { key: "no_autonomous_flag", setOp: "set_prefix_no_autonomous_flag", delOp: "delete_prefix_no_autonomous_flag" },
        { key: "no_on_link_flag", setOp: "set_prefix_no_on_link_flag", delOp: "delete_prefix_no_on_link_flag" },
      ];

      for (const { key, setOp, delOp } of boolPrefixFlags) {
        const wasSet = (oldP?.[key] as boolean) ?? false;
        const isSet = newP[key] as boolean;
        if (!oldP || isSet !== wasSet) {
          if (isSet) {
            prefixOps.push({ op: setOp });
          } else if (oldP && wasSet) {
            prefixOps.push({ op: delOp });
          }
        }
      }

      if (prefixOps.length > 0) {
        groups.push({ interface: name, prefix: newP.prefix, operations: prefixOps });
      }
    }

    // NAT64 prefixes
    const oldNat64 = original?.nat64_prefixes ?? [];
    const newNat64 = updated.nat64_prefixes;

    for (const oldN of oldNat64) {
      if (!newNat64.find((n) => n.prefix === oldN.prefix)) {
        groups.push({
          interface: name,
          nat64prefix: oldN.prefix,
          operations: [{ op: "delete_nat64prefix" }],
        });
      }
    }

    for (const newN of newNat64) {
      const oldN = oldNat64.find((n) => n.prefix === newN.prefix) ?? null;
      const nat64Ops: BatchOperation[] = [];

      if (!oldN) {
        nat64Ops.push({ op: "set_nat64prefix" });
      }

      if (!oldN || newN.valid_lifetime !== (oldN.valid_lifetime ?? null)) {
        if (newN.valid_lifetime) {
          nat64Ops.push({ op: "set_nat64prefix_valid_lifetime", value: newN.valid_lifetime });
        } else if (oldN?.valid_lifetime) {
          nat64Ops.push({ op: "delete_nat64prefix_valid_lifetime" });
        }
      }

      if (nat64Ops.length > 0) {
        groups.push({ interface: name, nat64prefix: newN.prefix, operations: nat64Ops });
      }
    }

    // Routes
    const oldRoutes = original?.routes ?? [];
    const newRoutes = updated.routes;

    for (const oldR of oldRoutes) {
      if (!newRoutes.find((r) => r.route === oldR.route)) {
        groups.push({
          interface: name,
          route: oldR.route,
          operations: [{ op: "delete_route" }],
        });
      }
    }

    for (const newR of newRoutes) {
      const oldR = oldRoutes.find((r) => r.route === newR.route) ?? null;
      const routeOps: BatchOperation[] = [];

      if (!oldR) {
        routeOps.push({ op: "set_route" });
      }

      if (!oldR || newR.route_preference !== (oldR.route_preference ?? null)) {
        if (newR.route_preference) {
          routeOps.push({ op: "set_route_preference", value: newR.route_preference });
        } else if (oldR?.route_preference) {
          routeOps.push({ op: "delete_route_preference" });
        }
      }

      if (!oldR || newR.valid_lifetime !== (oldR.valid_lifetime ?? null)) {
        if (newR.valid_lifetime) {
          routeOps.push({ op: "set_route_valid_lifetime", value: newR.valid_lifetime });
        } else if (oldR?.valid_lifetime) {
          routeOps.push({ op: "delete_route_valid_lifetime" });
        }
      }

      const wasNoRemove = oldR?.no_remove_route ?? false;
      if (!oldR || newR.no_remove_route !== wasNoRemove) {
        if (newR.no_remove_route) {
          routeOps.push({ op: "set_route_no_remove_route" });
        } else if (oldR && wasNoRemove) {
          routeOps.push({ op: "delete_route_no_remove_route" });
        }
      }

      if (routeOps.length > 0) {
        groups.push({ interface: name, route: newR.route, operations: routeOps });
      }
    }

    if (groups.length === 0) return { success: true };
    return this.batch(groups);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([
      { interface: name, operations: [{ op: "delete_interface" }] },
    ]);
  }
}

export const routerAdvertService = new RouterAdvertService();
