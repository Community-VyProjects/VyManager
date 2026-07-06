import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Srv6Locator {
  name: string;
  prefix: string | null;
  block_len: number | null;
  node_len: number | null;
  func_bits: number | null;
  behavior_usid: boolean;
}

export interface SrInterface {
  name: string;
  hmac: string | null;
}

export interface SegmentRoutingConfig {
  locators: Srv6Locator[];
  interfaces: SrInterface[];
}

export interface SegmentRoutingCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
    /**
     * True on VyOS 1.4, where FRR rejects any in-place modification of an
     * existing segment-routing tree: edits must delete the tree and recreate
     * it in two separate commits.
     */
    modify_requires_recreate: boolean;
  };
  features: {
    locators: { supported: boolean; description: string };
    interface_srv6: { supported: boolean; description: string };
  };
  instance_name?: string;
  instance_id?: string;
}

export interface SegmentRoutingBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class SegmentRoutingService {
  async getCapabilities(): Promise<SegmentRoutingCapabilities> {
    return apiClient.get<SegmentRoutingCapabilities>("/vyos/segment-routing/capabilities");
  }

  async getConfig(refresh = false): Promise<SegmentRoutingConfig> {
    return apiClient.get<SegmentRoutingConfig>("/vyos/segment-routing/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(ops: SegmentRoutingBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/segment-routing/batch", {
      operations: ops,
    });
    if (!result.success) throw new Error(result.error || "Segment Routing operation failed");
    return result;
  }

  private locatorOps(locator: Srv6Locator): SegmentRoutingBatchOperation[] {
    const ops: SegmentRoutingBatchOperation[] = [];
    if (locator.prefix) {
      ops.push({ op: "set_locator_prefix", value: `${locator.name},${locator.prefix}` });
    }
    if (locator.block_len != null) {
      ops.push({ op: "set_locator_block_len", value: `${locator.name},${locator.block_len}` });
    }
    if (locator.node_len != null) {
      ops.push({ op: "set_locator_node_len", value: `${locator.name},${locator.node_len}` });
    }
    if (locator.func_bits != null) {
      ops.push({ op: "set_locator_func_bits", value: `${locator.name},${locator.func_bits}` });
    }
    if (locator.behavior_usid) {
      ops.push({ op: "set_locator_behavior_usid", value: locator.name });
    }
    return ops;
  }

  /** All operations that reproduce a full desired config from an empty tree. */
  private fullConfigOps(config: SegmentRoutingConfig): SegmentRoutingBatchOperation[] {
    const ops: SegmentRoutingBatchOperation[] = [];
    // Interfaces first: VyOS rejects a locator commit unless at least one
    // interface has SRv6 enabled in the same commit.
    for (const iface of config.interfaces) {
      if (iface.hmac) {
        ops.push({ op: "set_interface_hmac", value: `${iface.name},${iface.hmac}` });
      } else {
        ops.push({ op: "set_interface_srv6", value: iface.name });
      }
    }
    for (const locator of config.locators) {
      ops.push(...this.locatorOps(locator));
    }
    return ops;
  }

  /**
   * Create a locator. When the config has no SRv6-enabled interface yet,
   * pass enableInterface to bundle the interface enable into the same
   * commit — VyOS rejects a locator without one.
   */
  async createLocator(locator: Srv6Locator, enableInterface?: string): Promise<VyOSResponse> {
    const ops: SegmentRoutingBatchOperation[] = [];
    if (enableInterface) {
      ops.push({ op: "set_interface_srv6", value: enableInterface });
    }
    ops.push(...this.locatorOps(locator));
    return this.batch(ops);
  }

  /** In-place locator update (works on VyOS 1.5/rolling). */
  async updateLocator(original: Srv6Locator, updated: Srv6Locator): Promise<VyOSResponse> {
    const ops: SegmentRoutingBatchOperation[] = [];
    const name = original.name;

    if (original.prefix !== updated.prefix && updated.prefix) {
      ops.push({ op: "set_locator_prefix", value: `${name},${updated.prefix}` });
    }
    if (original.block_len !== updated.block_len) {
      if (updated.block_len != null) {
        ops.push({ op: "set_locator_block_len", value: `${name},${updated.block_len}` });
      } else {
        ops.push({ op: "delete_locator_block_len", value: name });
      }
    }
    if (original.node_len !== updated.node_len) {
      if (updated.node_len != null) {
        ops.push({ op: "set_locator_node_len", value: `${name},${updated.node_len}` });
      } else {
        ops.push({ op: "delete_locator_node_len", value: name });
      }
    }
    if (original.func_bits !== updated.func_bits) {
      if (updated.func_bits != null) {
        ops.push({ op: "set_locator_func_bits", value: `${name},${updated.func_bits}` });
      } else {
        ops.push({ op: "delete_locator_func_bits", value: name });
      }
    }
    if (original.behavior_usid !== updated.behavior_usid) {
      if (updated.behavior_usid) {
        ops.push({ op: "set_locator_behavior_usid", value: name });
      } else {
        ops.push({ op: "delete_locator_behavior_usid", value: name });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  /** In-place locator delete (works on VyOS 1.5/rolling). */
  async deleteLocator(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_locator", value: name }]);
  }

  /**
   * VyOS 1.4 mutation path: FRR rejects in-place changes to an existing
   * segment-routing tree, so apply the desired end state by deleting the
   * whole tree (commit 1) and recreating it (commit 2). If the second
   * commit fails, the tree is left empty — callers must warn the user.
   */
  async applyViaRecreate(desired: SegmentRoutingConfig): Promise<VyOSResponse> {
    await this.batch([{ op: "delete_segment_routing" }]);
    const ops = this.fullConfigOps(desired);
    if (ops.length === 0) {
      return { success: true, data: { message: "Segment Routing configuration removed" } };
    }
    return this.batch(ops);
  }
}

export const segmentRoutingService = new SegmentRoutingService();
