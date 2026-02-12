import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface FailoverCheckTarget {
  address: string;
  interface?: string | null;
  vrf?: string | null;
}

export interface FailoverCheck {
  policy?: string | null;
  port?: number | null;
  targets: FailoverCheckTarget[];
  timeout?: number | null;
  type?: string | null;
}

export interface FailoverNextHop {
  address: string;
  check: FailoverCheck;
  interface?: string | null;
  metric?: number | null;
  onlink: boolean;
}

export interface FailoverDhcpInterface {
  name: string;
  check: FailoverCheck;
  interface?: string | null;
  metric?: number | null;
  onlink: boolean;
}

export interface FailoverRoute {
  destination: string;
  next_hops: FailoverNextHop[];
  dhcp_interfaces: FailoverDhcpInterface[];
}

export interface FailoverConfig {
  routes: FailoverRoute[];
}

export interface FailoverCapabilities {
  version: string;
  features: {
    routes: { supported: boolean; description: string };
    next_hop: { supported: boolean; description: string };
    dhcp_interface: { supported: boolean; description: string };
    check_target_properties: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface FailoverBatchOperation {
  op: string;
  value?: string | null;
}

export interface FailoverBatchRequest {
  destination: string;
  next_hop?: string | null;
  dhcp_interface?: string | null;
  operations: FailoverBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Operation Builder Helpers
//
// When body.next_hop / body.dhcp_interface are omitted, the backend fills
// remaining method params from the comma-separated operation.value.
// This lets us pack ALL operations into a single batch call.
//
// Pattern for next-hop ops:
//   set_next_hop(dest, next_hop)                        → value: "NH"
//   set_next_hop_metric(dest, next_hop, value)          → value: "NH,VAL"
//   set_next_hop_onlink(dest, next_hop)                 → value: "NH"
//   set_next_hop_check_target(dest, nh, target)         → value: "NH,TARGET"
//   set_next_hop_check_target_interface(dest, nh, t, v) → value: "NH,TARGET,IFACE"
//   delete_next_hop_check_target_all(dest, next_hop)    → value: "NH"
//
// Same pattern applies to dhcp_interface ops.
// ============================================================================

function nhOp(op: string, nhAddr: string, ...extra: string[]): FailoverBatchOperation {
  const parts = [nhAddr, ...extra];
  return { op, value: parts.join(",") };
}

function dhcpOp(op: string, dhcpName: string, ...extra: string[]): FailoverBatchOperation {
  const parts = [dhcpName, ...extra];
  return { op, value: parts.join(",") };
}

/**
 * Build all operations for creating a next-hop (set + all properties + targets).
 */
function buildNextHopCreateOps(nh: FailoverNextHop): FailoverBatchOperation[] {
  const addr = nh.address;
  const ops: FailoverBatchOperation[] = [nhOp("set_next_hop", addr)];

  if (nh.metric != null) {
    ops.push(nhOp("set_next_hop_metric", addr, String(nh.metric)));
  }
  if (nh.interface) {
    ops.push(nhOp("set_next_hop_interface", addr, nh.interface));
  }
  if (nh.onlink) {
    ops.push(nhOp("set_next_hop_onlink", addr));
  }
  if (nh.check.type) {
    ops.push(nhOp("set_next_hop_check_type", addr, nh.check.type));
  }
  if (nh.check.policy) {
    ops.push(nhOp("set_next_hop_check_policy", addr, nh.check.policy));
  }
  if (nh.check.port != null) {
    ops.push(nhOp("set_next_hop_check_port", addr, String(nh.check.port)));
  }
  if (nh.check.timeout != null) {
    ops.push(nhOp("set_next_hop_check_timeout", addr, String(nh.check.timeout)));
  }
  for (const target of nh.check.targets) {
    ops.push(nhOp("set_next_hop_check_target", addr, target.address));
    if (target.interface) {
      ops.push(nhOp("set_next_hop_check_target_interface", addr, target.address, target.interface));
    }
    if (target.vrf) {
      ops.push(nhOp("set_next_hop_check_target_vrf", addr, target.address, target.vrf));
    }
  }

  return ops;
}

/**
 * Build all operations for creating a DHCP interface (set + all properties + targets).
 */
function buildDhcpInterfaceCreateOps(d: FailoverDhcpInterface): FailoverBatchOperation[] {
  const name = d.name;
  const ops: FailoverBatchOperation[] = [dhcpOp("set_dhcp_interface", name)];

  if (d.metric != null) {
    ops.push(dhcpOp("set_dhcp_interface_metric", name, String(d.metric)));
  }
  if (d.interface) {
    ops.push(dhcpOp("set_dhcp_interface_interface", name, d.interface));
  }
  if (d.onlink) {
    ops.push(dhcpOp("set_dhcp_interface_onlink", name));
  }
  if (d.check.type) {
    ops.push(dhcpOp("set_dhcp_interface_check_type", name, d.check.type));
  }
  if (d.check.policy) {
    ops.push(dhcpOp("set_dhcp_interface_check_policy", name, d.check.policy));
  }
  if (d.check.port != null) {
    ops.push(dhcpOp("set_dhcp_interface_check_port", name, String(d.check.port)));
  }
  if (d.check.timeout != null) {
    ops.push(dhcpOp("set_dhcp_interface_check_timeout", name, String(d.check.timeout)));
  }
  for (const target of d.check.targets) {
    ops.push(dhcpOp("set_dhcp_interface_check_target", name, target.address));
    if (target.interface) {
      ops.push(dhcpOp("set_dhcp_interface_check_target_interface", name, target.address, target.interface));
    }
    if (target.vrf) {
      ops.push(dhcpOp("set_dhcp_interface_check_target_vrf", name, target.address, target.vrf));
    }
  }

  return ops;
}

/**
 * Build diff operations for updating an existing next-hop.
 */
function buildNextHopUpdateOps(
  original: FailoverNextHop,
  updated: FailoverNextHop
): FailoverBatchOperation[] {
  const ops: FailoverBatchOperation[] = [];
  const addr = updated.address;

  if (updated.metric !== original.metric) {
    if (updated.metric != null) {
      ops.push(nhOp("set_next_hop_metric", addr, String(updated.metric)));
    } else {
      ops.push(nhOp("delete_next_hop_metric", addr));
    }
  }
  if (updated.interface !== original.interface) {
    if (updated.interface) {
      ops.push(nhOp("set_next_hop_interface", addr, updated.interface));
    } else {
      ops.push(nhOp("delete_next_hop_interface", addr));
    }
  }
  if (updated.onlink !== original.onlink) {
    ops.push(nhOp(updated.onlink ? "set_next_hop_onlink" : "delete_next_hop_onlink", addr));
  }
  if (updated.check.type !== original.check.type) {
    if (updated.check.type) {
      ops.push(nhOp("set_next_hop_check_type", addr, updated.check.type));
    } else {
      ops.push(nhOp("delete_next_hop_check_type", addr));
    }
  }
  if (updated.check.policy !== original.check.policy) {
    if (updated.check.policy) {
      ops.push(nhOp("set_next_hop_check_policy", addr, updated.check.policy));
    } else {
      ops.push(nhOp("delete_next_hop_check_policy", addr));
    }
  }
  if (updated.check.port !== original.check.port) {
    if (updated.check.port != null) {
      ops.push(nhOp("set_next_hop_check_port", addr, String(updated.check.port)));
    } else {
      ops.push(nhOp("delete_next_hop_check_port", addr));
    }
  }
  if (updated.check.timeout !== original.check.timeout) {
    if (updated.check.timeout != null) {
      ops.push(nhOp("set_next_hop_check_timeout", addr, String(updated.check.timeout)));
    } else {
      ops.push(nhOp("delete_next_hop_check_timeout", addr));
    }
  }

  // Targets: if changed, delete all old then set all new
  if (checkTargetsChanged(original.check.targets, updated.check.targets)) {
    if (original.check.targets.length > 0) {
      ops.push(nhOp("delete_next_hop_check_target_all", addr));
    }
    for (const target of updated.check.targets) {
      ops.push(nhOp("set_next_hop_check_target", addr, target.address));
      if (target.interface) {
        ops.push(nhOp("set_next_hop_check_target_interface", addr, target.address, target.interface));
      }
      if (target.vrf) {
        ops.push(nhOp("set_next_hop_check_target_vrf", addr, target.address, target.vrf));
      }
    }
  }

  return ops;
}

/**
 * Build diff operations for updating an existing DHCP interface.
 */
function buildDhcpInterfaceUpdateOps(
  original: FailoverDhcpInterface,
  updated: FailoverDhcpInterface
): FailoverBatchOperation[] {
  const ops: FailoverBatchOperation[] = [];
  const name = updated.name;

  if (updated.metric !== original.metric) {
    if (updated.metric != null) {
      ops.push(dhcpOp("set_dhcp_interface_metric", name, String(updated.metric)));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_metric", name));
    }
  }
  if (updated.interface !== original.interface) {
    if (updated.interface) {
      ops.push(dhcpOp("set_dhcp_interface_interface", name, updated.interface));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_interface", name));
    }
  }
  if (updated.onlink !== original.onlink) {
    ops.push(dhcpOp(updated.onlink ? "set_dhcp_interface_onlink" : "delete_dhcp_interface_onlink", name));
  }
  if (updated.check.type !== original.check.type) {
    if (updated.check.type) {
      ops.push(dhcpOp("set_dhcp_interface_check_type", name, updated.check.type));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_check_type", name));
    }
  }
  if (updated.check.policy !== original.check.policy) {
    if (updated.check.policy) {
      ops.push(dhcpOp("set_dhcp_interface_check_policy", name, updated.check.policy));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_check_policy", name));
    }
  }
  if (updated.check.port !== original.check.port) {
    if (updated.check.port != null) {
      ops.push(dhcpOp("set_dhcp_interface_check_port", name, String(updated.check.port)));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_check_port", name));
    }
  }
  if (updated.check.timeout !== original.check.timeout) {
    if (updated.check.timeout != null) {
      ops.push(dhcpOp("set_dhcp_interface_check_timeout", name, String(updated.check.timeout)));
    } else {
      ops.push(dhcpOp("delete_dhcp_interface_check_timeout", name));
    }
  }

  if (checkTargetsChanged(original.check.targets, updated.check.targets)) {
    if (original.check.targets.length > 0) {
      ops.push(dhcpOp("delete_dhcp_interface_check_target_all", name));
    }
    for (const target of updated.check.targets) {
      ops.push(dhcpOp("set_dhcp_interface_check_target", name, target.address));
      if (target.interface) {
        ops.push(dhcpOp("set_dhcp_interface_check_target_interface", name, target.address, target.interface));
      }
      if (target.vrf) {
        ops.push(dhcpOp("set_dhcp_interface_check_target_vrf", name, target.address, target.vrf));
      }
    }
  }

  return ops;
}

function checkTargetsChanged(
  origTargets: FailoverCheckTarget[],
  updTargets: FailoverCheckTarget[]
): boolean {
  if (origTargets.length !== updTargets.length) return true;
  return origTargets.some((t, i) => {
    const u = updTargets[i];
    return (
      t.address !== u.address ||
      (t.interface || null) !== (u.interface || null) ||
      (t.vrf || null) !== (u.vrf || null)
    );
  });
}

// ============================================================================
// API Service
// ============================================================================

class FailoverService {
  async getCapabilities(): Promise<FailoverCapabilities> {
    return apiClient.get<FailoverCapabilities>("/vyos/failover/capabilities");
  }

  async getConfig(refresh = false): Promise<FailoverConfig> {
    return apiClient.get<FailoverConfig>("/vyos/failover/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  /**
   * Send a single batch request and refresh config after.
   * body.next_hop and body.dhcp_interface are left null —
   * the next-hop/dhcp-interface identifiers are packed into each op's value.
   */
  async batchConfigure(request: FailoverBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/failover/batch", request);
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Route CRUD — each sends exactly ONE batch call
  // ==========================================================================

  async createRoute(route: FailoverRoute): Promise<VyOSResponse> {
    const ops: FailoverBatchOperation[] = [{ op: "set_route" }];

    for (const nh of route.next_hops) {
      ops.push(...buildNextHopCreateOps(nh));
    }
    for (const dhcp of route.dhcp_interfaces) {
      ops.push(...buildDhcpInterfaceCreateOps(dhcp));
    }

    return this.batchConfigure({
      destination: route.destination,
      operations: ops,
    });
  }

  async updateRoute(original: FailoverRoute, updated: FailoverRoute): Promise<VyOSResponse> {
    const ops: FailoverBatchOperation[] = [];
    const dest = original.destination;

    // --- Next-hops diff ---
    const origNhAddrs = new Set(original.next_hops.map((nh) => nh.address));
    const updNhAddrs = new Set(updated.next_hops.map((nh) => nh.address));

    // Delete removed next-hops
    for (const nh of original.next_hops) {
      if (!updNhAddrs.has(nh.address)) {
        ops.push(nhOp("delete_next_hop", nh.address));
      }
    }

    // Add new or diff-update existing next-hops
    for (const nh of updated.next_hops) {
      if (!origNhAddrs.has(nh.address)) {
        ops.push(...buildNextHopCreateOps(nh));
      } else {
        const origNh = original.next_hops.find((n) => n.address === nh.address)!;
        ops.push(...buildNextHopUpdateOps(origNh, nh));
      }
    }

    // --- DHCP interfaces diff ---
    const origDhcpNames = new Set(original.dhcp_interfaces.map((d) => d.name));
    const updDhcpNames = new Set(updated.dhcp_interfaces.map((d) => d.name));

    for (const dhcp of original.dhcp_interfaces) {
      if (!updDhcpNames.has(dhcp.name)) {
        ops.push(dhcpOp("delete_dhcp_interface", dhcp.name));
      }
    }

    for (const dhcp of updated.dhcp_interfaces) {
      if (!origDhcpNames.has(dhcp.name)) {
        ops.push(...buildDhcpInterfaceCreateOps(dhcp));
      } else {
        const origDhcp = original.dhcp_interfaces.find((d) => d.name === dhcp.name)!;
        ops.push(...buildDhcpInterfaceUpdateOps(origDhcp, dhcp));
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({
      destination: dest,
      operations: ops,
    });
  }

  async deleteRoute(destination: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      destination,
      operations: [{ op: "delete_route" }],
    });
  }
}

export const failoverService = new FailoverService();
