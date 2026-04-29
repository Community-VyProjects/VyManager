import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VppVif {
  vlan_id: string;
  description: string | null;
  disabled: boolean;
  addresses: string[];
  mtu: string | null;
}

export interface VppBridgeMember {
  interface: string;
  bvi: boolean;
}

export interface VppBondingConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  mode: string | null;
  hash_policy: string | null;
  mac: string | null;
  mtu: string | null;
  addresses: string[];
  members: string[];
  vif: VppVif[];
}

export interface VppBridgeConfig {
  name: string;
  description: string | null;
  members: VppBridgeMember[];
}

export interface VppGreConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  addresses: string[];
  mtu: string | null;
  remote: string | null;
  source_address: string | null;
  tunnel_type: string | null;
  key: string | null;
}

export interface VppIpipConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  addresses: string[];
  mtu: string | null;
  remote: string | null;
  source_address: string | null;
}

export interface VppLoopbackConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  addresses: string[];
  mtu: string | null;
  vif: VppVif[];
}

export interface VppVxlanConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  addresses: string[];
  mtu: string | null;
  remote: string | null;
  source_address: string | null;
  vni: string | null;
}

export interface VppXconnectConfig {
  name: string;
  description: string | null;
  disabled: boolean;
  members: string[];
}

export type VppSubType = "bonding" | "bridge" | "gre" | "ipip" | "loopback" | "vxlan" | "xconnect";

export type VppAnyConfig =
  | VppBondingConfig
  | VppBridgeConfig
  | VppGreConfig
  | VppIpipConfig
  | VppLoopbackConfig
  | VppVxlanConfig
  | VppXconnectConfig;

export interface VppFeatureCapability {
  supported: boolean;
  description: string;
  naming?: string;
  fields?: string[];
  tunnel_types?: string[];
}

export interface VppCapabilities {
  version: string;
  version_info: { is_1_4: boolean; is_1_5: boolean };
  supported: boolean;
  note: string;
  features: {
    bonding: VppFeatureCapability;
    bridge: VppFeatureCapability;
    gre: VppFeatureCapability;
    ipip: VppFeatureCapability;
    loopback: VppFeatureCapability;
    vxlan: VppFeatureCapability;
    xconnect: VppFeatureCapability;
  };
}

export interface VppConfigResponse {
  bonding: VppBondingConfig[];
  bridge: VppBridgeConfig[];
  gre: VppGreConfig[];
  ipip: VppIpipConfig[];
  loopback: VppLoopbackConfig[];
  vxlan: VppVxlanConfig[];
  xconnect: VppXconnectConfig[];
  total: number;
}

export interface VppBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Input types
// ============================================================================

export interface VppVifInput {
  vlan_id: string;
  description?: string;
  disabled?: boolean;
  addresses?: string[];
  mtu?: string;
}

export interface VppBridgeMemberInput {
  interface: string;
  bvi?: boolean;
}

export interface CreateBondingInput {
  name: string;
  description?: string;
  disabled?: boolean;
  mode?: string;
  hash_policy?: string;
  mac?: string;
  mtu?: string;
  addresses?: string[];
  members?: string[];
  vif?: VppVifInput[];
}

export interface CreateBridgeInput {
  name: string;
  description?: string;
  members?: VppBridgeMemberInput[];
}

export interface CreateGreInput {
  name: string;
  description?: string;
  disabled?: boolean;
  addresses?: string[];
  mtu?: string;
  remote?: string;
  source_address?: string;
  tunnel_type?: string;
  key?: string;
}

export interface CreateIpipInput {
  name: string;
  description?: string;
  disabled?: boolean;
  addresses?: string[];
  mtu?: string;
  remote?: string;
  source_address?: string;
}

export interface CreateLoopbackInput {
  name: string;
  description?: string;
  disabled?: boolean;
  addresses?: string[];
  mtu?: string;
  vif?: VppVifInput[];
}

export interface CreateVxlanInput {
  name: string;
  description?: string;
  disabled?: boolean;
  addresses?: string[];
  mtu?: string;
  remote?: string;
  source_address?: string;
  vni?: string;
}

export interface CreateXconnectInput {
  name: string;
  description?: string;
  disabled?: boolean;
  members?: string[];
}

// ============================================================================
// Helper: infer sub-type from name prefix
// ============================================================================

export function getVppSubType(name: string): VppSubType {
  if (name.startsWith("vppbond")) return "bonding";
  if (name.startsWith("vppbr")) return "bridge";
  if (name.startsWith("vppgre")) return "gre";
  if (name.startsWith("vppipip")) return "ipip";
  if (name.startsWith("vpplo")) return "loopback";
  if (name.startsWith("vppvxlan")) return "vxlan";
  if (name.startsWith("vppxcon")) return "xconnect";
  return "bonding";
}

// ============================================================================
// Operation builders
// ============================================================================

function buildVifOps(prefix: "bonding" | "loopback", vif: VppVifInput): VppBatchOperation[] {
  const ops: VppBatchOperation[] = [];
  const v = vif.vlan_id;
  if (vif.description) ops.push({ op: `set_${prefix}_vif_description`, value: `${v}:${vif.description}` });
  if (vif.disabled) ops.push({ op: `set_${prefix}_vif_disable`, value: v });
  for (const addr of vif.addresses ?? []) ops.push({ op: `set_${prefix}_vif_address`, value: `${v}:${addr}` });
  if (vif.mtu) ops.push({ op: `set_${prefix}_vif_mtu`, value: `${v}:${vif.mtu}` });
  return ops;
}

// ============================================================================
// API Service
// ============================================================================

class VppService {
  async getCapabilities(): Promise<VppCapabilities> {
    return apiClient.get<VppCapabilities>("/vyos/vpp/capabilities");
  }

  async getConfig(refresh = false): Promise<VppConfigResponse> {
    return apiClient.get<VppConfigResponse>("/vyos/vpp/config", {
      refresh: refresh.toString(),
    });
  }

  async batchConfigure(interfaceName: string, operations: VppBatchOperation[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/vpp/batch", {
      interface: interfaceName,
      operations,
    });
  }

  // ---- Bonding ----

  async createBonding(config: CreateBondingInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_bonding_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_bonding_disable" });
    if (config.mode) ops.push({ op: "set_bonding_mode", value: config.mode });
    if (config.hash_policy) ops.push({ op: "set_bonding_hash_policy", value: config.hash_policy });
    if (config.mac) ops.push({ op: "set_bonding_mac", value: config.mac });
    if (config.mtu) ops.push({ op: "set_bonding_mtu", value: config.mtu });
    for (const addr of config.addresses ?? []) ops.push({ op: "set_bonding_address", value: addr });
    for (const m of config.members ?? []) ops.push({ op: "set_bonding_member", value: m });
    for (const vif of config.vif ?? []) ops.push(...buildVifOps("bonding", vif));
    return this.batchConfigure(config.name, ops);
  }

  async updateBonding(name: string, current: VppBondingConfig, updated: Partial<CreateBondingInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];

    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_bonding_description", value: updated.description });
      else ops.push({ op: "delete_bonding_description" });
    }
    if (updated.disabled !== undefined) {
      ops.push({ op: updated.disabled ? "set_bonding_disable" : "delete_bonding_disable" });
    }
    if (updated.mode !== undefined) {
      if (updated.mode) ops.push({ op: "set_bonding_mode", value: updated.mode });
      else ops.push({ op: "delete_bonding_mode" });
    }
    if (updated.hash_policy !== undefined) {
      if (updated.hash_policy) ops.push({ op: "set_bonding_hash_policy", value: updated.hash_policy });
      else ops.push({ op: "delete_bonding_hash_policy" });
    }
    if (updated.mac !== undefined) {
      if (updated.mac) ops.push({ op: "set_bonding_mac", value: updated.mac });
      else ops.push({ op: "delete_bonding_mac" });
    }
    if (updated.mtu !== undefined) {
      if (updated.mtu) ops.push({ op: "set_bonding_mtu", value: updated.mtu });
      else ops.push({ op: "delete_bonding_mtu" });
    }
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_bonding_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_bonding_address", value: addr });
    }
    if (updated.members !== undefined) {
      for (const old of current.members) ops.push({ op: "delete_bonding_member", value: old });
      for (const m of updated.members) ops.push({ op: "set_bonding_member", value: m });
    }
    if (updated.vif !== undefined) {
      for (const old of current.vif) ops.push({ op: "delete_bonding_vif", value: old.vlan_id });
      for (const vif of updated.vif) ops.push(...buildVifOps("bonding", vif));
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- Bridge ----

  async createBridge(config: CreateBridgeInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_bridge_description", value: config.description });
    for (const m of config.members ?? []) {
      ops.push({ op: "set_bridge_member", value: m.interface });
      if (m.bvi) ops.push({ op: "set_bridge_member_bvi", value: m.interface });
    }
    return this.batchConfigure(config.name, ops);
  }

  async updateBridge(name: string, current: VppBridgeConfig, updated: Partial<CreateBridgeInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_bridge_description", value: updated.description });
      else ops.push({ op: "delete_bridge_description" });
    }
    if (updated.members !== undefined) {
      for (const old of current.members) ops.push({ op: "delete_bridge_member", value: old.interface });
      for (const m of updated.members) {
        ops.push({ op: "set_bridge_member", value: m.interface });
        if (m.bvi) ops.push({ op: "set_bridge_member_bvi", value: m.interface });
      }
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- GRE ----

  async createGre(config: CreateGreInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_gre_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_gre_disable" });
    if (config.remote) ops.push({ op: "set_gre_remote", value: config.remote });
    if (config.source_address) ops.push({ op: "set_gre_source_address", value: config.source_address });
    if (config.tunnel_type) ops.push({ op: "set_gre_tunnel_type", value: config.tunnel_type });
    if (config.key) ops.push({ op: "set_gre_key", value: config.key });
    if (config.mtu) ops.push({ op: "set_gre_mtu", value: config.mtu });
    for (const addr of config.addresses ?? []) ops.push({ op: "set_gre_address", value: addr });
    return this.batchConfigure(config.name, ops);
  }

  async updateGre(name: string, current: VppGreConfig, updated: Partial<CreateGreInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_gre_description", value: updated.description });
      else ops.push({ op: "delete_gre_description" });
    }
    if (updated.disabled !== undefined) ops.push({ op: updated.disabled ? "set_gre_disable" : "delete_gre_disable" });
    if (updated.remote !== undefined) {
      if (updated.remote) ops.push({ op: "set_gre_remote", value: updated.remote });
      else ops.push({ op: "delete_gre_remote" });
    }
    if (updated.source_address !== undefined) {
      if (updated.source_address) ops.push({ op: "set_gre_source_address", value: updated.source_address });
      else ops.push({ op: "delete_gre_source_address" });
    }
    if (updated.tunnel_type !== undefined) {
      if (updated.tunnel_type) ops.push({ op: "set_gre_tunnel_type", value: updated.tunnel_type });
      else ops.push({ op: "delete_gre_tunnel_type" });
    }
    if (updated.key !== undefined) {
      if (updated.key) ops.push({ op: "set_gre_key", value: updated.key });
      else ops.push({ op: "delete_gre_key" });
    }
    if (updated.mtu !== undefined) {
      if (updated.mtu) ops.push({ op: "set_gre_mtu", value: updated.mtu });
      else ops.push({ op: "delete_gre_mtu" });
    }
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_gre_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_gre_address", value: addr });
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- IPIP ----

  async createIpip(config: CreateIpipInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_ipip_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_ipip_disable" });
    if (config.remote) ops.push({ op: "set_ipip_remote", value: config.remote });
    if (config.source_address) ops.push({ op: "set_ipip_source_address", value: config.source_address });
    if (config.mtu) ops.push({ op: "set_ipip_mtu", value: config.mtu });
    for (const addr of config.addresses ?? []) ops.push({ op: "set_ipip_address", value: addr });
    return this.batchConfigure(config.name, ops);
  }

  async updateIpip(name: string, current: VppIpipConfig, updated: Partial<CreateIpipInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_ipip_description", value: updated.description });
      else ops.push({ op: "delete_ipip_description" });
    }
    if (updated.disabled !== undefined) ops.push({ op: updated.disabled ? "set_ipip_disable" : "delete_ipip_disable" });
    if (updated.remote !== undefined) {
      if (updated.remote) ops.push({ op: "set_ipip_remote", value: updated.remote });
      else ops.push({ op: "delete_ipip_remote" });
    }
    if (updated.source_address !== undefined) {
      if (updated.source_address) ops.push({ op: "set_ipip_source_address", value: updated.source_address });
      else ops.push({ op: "delete_ipip_source_address" });
    }
    if (updated.mtu !== undefined) {
      if (updated.mtu) ops.push({ op: "set_ipip_mtu", value: updated.mtu });
      else ops.push({ op: "delete_ipip_mtu" });
    }
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_ipip_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_ipip_address", value: addr });
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- Loopback ----

  async createLoopback(config: CreateLoopbackInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_loopback_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_loopback_disable" });
    if (config.mtu) ops.push({ op: "set_loopback_mtu", value: config.mtu });
    for (const addr of config.addresses ?? []) ops.push({ op: "set_loopback_address", value: addr });
    for (const vif of config.vif ?? []) ops.push(...buildVifOps("loopback", vif));
    return this.batchConfigure(config.name, ops);
  }

  async updateLoopback(name: string, current: VppLoopbackConfig, updated: Partial<CreateLoopbackInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_loopback_description", value: updated.description });
      else ops.push({ op: "delete_loopback_description" });
    }
    if (updated.disabled !== undefined) ops.push({ op: updated.disabled ? "set_loopback_disable" : "delete_loopback_disable" });
    if (updated.mtu !== undefined) {
      if (updated.mtu) ops.push({ op: "set_loopback_mtu", value: updated.mtu });
      else ops.push({ op: "delete_loopback_mtu" });
    }
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_loopback_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_loopback_address", value: addr });
    }
    if (updated.vif !== undefined) {
      for (const old of current.vif) ops.push({ op: "delete_loopback_vif", value: old.vlan_id });
      for (const vif of updated.vif) ops.push(...buildVifOps("loopback", vif));
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- VXLAN ----

  async createVxlan(config: CreateVxlanInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_vxlan_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_vxlan_disable" });
    if (config.remote) ops.push({ op: "set_vxlan_remote", value: config.remote });
    if (config.source_address) ops.push({ op: "set_vxlan_source_address", value: config.source_address });
    if (config.vni) ops.push({ op: "set_vxlan_vni", value: config.vni });
    if (config.mtu) ops.push({ op: "set_vxlan_mtu", value: config.mtu });
    for (const addr of config.addresses ?? []) ops.push({ op: "set_vxlan_address", value: addr });
    return this.batchConfigure(config.name, ops);
  }

  async updateVxlan(name: string, current: VppVxlanConfig, updated: Partial<CreateVxlanInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_vxlan_description", value: updated.description });
      else ops.push({ op: "delete_vxlan_description" });
    }
    if (updated.disabled !== undefined) ops.push({ op: updated.disabled ? "set_vxlan_disable" : "delete_vxlan_disable" });
    if (updated.remote !== undefined) {
      if (updated.remote) ops.push({ op: "set_vxlan_remote", value: updated.remote });
      else ops.push({ op: "delete_vxlan_remote" });
    }
    if (updated.source_address !== undefined) {
      if (updated.source_address) ops.push({ op: "set_vxlan_source_address", value: updated.source_address });
      else ops.push({ op: "delete_vxlan_source_address" });
    }
    if (updated.vni !== undefined) {
      if (updated.vni) ops.push({ op: "set_vxlan_vni", value: updated.vni });
      else ops.push({ op: "delete_vxlan_vni" });
    }
    if (updated.mtu !== undefined) {
      if (updated.mtu) ops.push({ op: "set_vxlan_mtu", value: updated.mtu });
      else ops.push({ op: "delete_vxlan_mtu" });
    }
    if (updated.addresses !== undefined) {
      for (const old of current.addresses) ops.push({ op: "delete_vxlan_address", value: old });
      for (const addr of updated.addresses) ops.push({ op: "set_vxlan_address", value: addr });
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- XConnect ----

  async createXconnect(config: CreateXconnectInput): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (config.description) ops.push({ op: "set_xconnect_description", value: config.description });
    if (config.disabled) ops.push({ op: "set_xconnect_disable" });
    for (const m of config.members ?? []) ops.push({ op: "set_xconnect_member", value: m });
    return this.batchConfigure(config.name, ops);
  }

  async updateXconnect(name: string, current: VppXconnectConfig, updated: Partial<CreateXconnectInput>): Promise<VyOSResponse> {
    const ops: VppBatchOperation[] = [];
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_xconnect_description", value: updated.description });
      else ops.push({ op: "delete_xconnect_description" });
    }
    if (updated.disabled !== undefined) ops.push({ op: updated.disabled ? "set_xconnect_disable" : "delete_xconnect_disable" });
    if (updated.members !== undefined) {
      for (const old of current.members) ops.push({ op: "delete_xconnect_member", value: old });
      for (const m of updated.members) ops.push({ op: "set_xconnect_member", value: m });
    }
    if (ops.length === 0) return { success: true, data: { message: "No changes detected" } };
    return this.batchConfigure(name, ops);
  }

  // ---- Delete ----

  async deleteInterface(name: string, subType: VppSubType): Promise<VyOSResponse> {
    const opMap: Record<VppSubType, string> = {
      bonding: "delete_bonding",
      bridge: "delete_bridge",
      gre: "delete_gre",
      ipip: "delete_ipip",
      loopback: "delete_loopback",
      vxlan: "delete_vxlan",
      xconnect: "delete_xconnect",
    };
    return this.batchConfigure(name, [{ op: opMap[subType] }]);
  }
}

export const vppService = new VppService();
