import { apiClient } from "./client";

// ============================================================================
// Config types (mirror backend Pydantic models)
// ============================================================================

export interface SSHAccessControl {
  allow_users: string[];
  allow_groups: string[];
  deny_users: string[];
  deny_groups: string[];
}

export interface SSHDynamicProtection {
  enabled: boolean;
  allow_from: string[];
  block_time: string | null;
  detect_time: string | null;
  threshold: string | null;
}

export interface SSHFido {
  pin_required: boolean;
  touch_required: boolean;
}

export interface SSHRekey {
  data: string | null;
  time: string | null;
}

export interface SSHConfig {
  ports: string[];
  listen_addresses: string[];
  vrfs: string[];
  disable_host_validation: boolean;
  disable_password_authentication: boolean;
  loglevel: string | null;
  client_keepalive_interval: string | null;
  ciphers: string[];
  macs: string[];
  key_exchanges: string[];
  hostkey_algorithms: string[];
  pubkey_accepted_algorithms: string[];
  trusted_user_ca: string | null;
  access_control: SSHAccessControl;
  dynamic_protection: SSHDynamicProtection;
  fido: SSHFido;
  rekey: SSHRekey;
}

interface FeatureFlag {
  supported: boolean;
  description?: string;
}

interface MultiValueFeature extends FeatureFlag {
  multi_value?: boolean;
  values?: string[];
  default?: string;
}

export interface SSHCapabilities {
  version: string;
  features: {
    ssh: FeatureFlag;
    port: MultiValueFeature;
    listen_address: MultiValueFeature;
    vrf: MultiValueFeature;
    disable_host_validation: FeatureFlag;
    disable_password_authentication: FeatureFlag;
    loglevel: MultiValueFeature;
    client_keepalive_interval: FeatureFlag;
    cipher: MultiValueFeature;
    mac: MultiValueFeature;
    key_exchange: MultiValueFeature;
    hostkey_algorithm: MultiValueFeature;
    pubkey_accepted_algorithm: MultiValueFeature;
    trusted_user_ca: FeatureFlag;
    access_control: FeatureFlag;
    dynamic_protection: FeatureFlag & {
      defaults: { block_time: string; detect_time: string; threshold: string };
    };
    fido: FeatureFlag;
    rekey: FeatureFlag;
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Diff helpers
// ============================================================================

function diffMulti(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  oldVals: string[],
  newVals: string[]
): void {
  for (const v of oldVals.filter((x) => !newVals.includes(x))) {
    ops.push({ op: deleteOp, value: v });
  }
  for (const v of newVals.filter((x) => !oldVals.includes(x))) {
    ops.push({ op: setOp, value: v });
  }
}

function diffSingle(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  oldVal: string | null | undefined,
  newVal: string
): void {
  const o = oldVal ?? "";
  if (newVal === o) return;
  if (newVal === "") ops.push({ op: deleteOp });
  else ops.push({ op: setOp, value: newVal });
}

function diffBool(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  oldVal: boolean,
  newVal: boolean
): void {
  if (newVal === oldVal) return;
  ops.push({ op: newVal ? setOp : deleteOp });
}

// ============================================================================
// Service
// ============================================================================

class SSHService {
  async getCapabilities(): Promise<SSHCapabilities> {
    return apiClient.get<SSHCapabilities>("/vyos/ssh/capabilities");
  }

  async getConfig(refresh = false): Promise<SSHConfig> {
    return apiClient.get<SSHConfig>("/vyos/ssh/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/ssh/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  /**
   * Diff the full configuration and apply only the changed fields. Each modal
   * edits a copy of the config and submits the whole thing; unchanged sections
   * produce no operations.
   */
  async updateConfig(original: SSHConfig, next: SSHConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // Multi-value lists
    diffMulti(ops, "set_port", "delete_port", original.ports, next.ports);
    diffMulti(ops, "set_listen_address", "delete_listen_address", original.listen_addresses, next.listen_addresses);
    diffMulti(ops, "set_vrf", "delete_vrf", original.vrfs, next.vrfs);
    diffMulti(ops, "set_cipher", "delete_cipher", original.ciphers, next.ciphers);
    diffMulti(ops, "set_mac", "delete_mac", original.macs, next.macs);
    diffMulti(ops, "set_key_exchange", "delete_key_exchange", original.key_exchanges, next.key_exchanges);
    diffMulti(ops, "set_hostkey_algorithm", "delete_hostkey_algorithm", original.hostkey_algorithms, next.hostkey_algorithms);
    diffMulti(ops, "set_pubkey_accepted_algorithm", "delete_pubkey_accepted_algorithm", original.pubkey_accepted_algorithms, next.pubkey_accepted_algorithms);

    // Single values
    diffSingle(ops, "set_loglevel", "delete_loglevel", original.loglevel, next.loglevel ?? "");
    diffSingle(ops, "set_client_keepalive_interval", "delete_client_keepalive_interval", original.client_keepalive_interval, next.client_keepalive_interval ?? "");
    diffSingle(ops, "set_trusted_user_ca", "delete_trusted_user_ca", original.trusted_user_ca, next.trusted_user_ca ?? "");
    diffSingle(ops, "set_rekey_data", "delete_rekey_data", original.rekey.data, next.rekey.data ?? "");
    diffSingle(ops, "set_rekey_time", "delete_rekey_time", original.rekey.time, next.rekey.time ?? "");

    // Presence flags
    diffBool(ops, "set_disable_host_validation", "delete_disable_host_validation", original.disable_host_validation, next.disable_host_validation);
    diffBool(ops, "set_disable_password_authentication", "delete_disable_password_authentication", original.disable_password_authentication, next.disable_password_authentication);
    diffBool(ops, "set_fido_pin_required", "delete_fido_pin_required", original.fido.pin_required, next.fido.pin_required);
    diffBool(ops, "set_fido_touch_required", "delete_fido_touch_required", original.fido.touch_required, next.fido.touch_required);

    // Access control
    const oa = original.access_control;
    const na = next.access_control;
    diffMulti(ops, "set_access_control_allow_user", "delete_access_control_allow_user", oa.allow_users, na.allow_users);
    diffMulti(ops, "set_access_control_allow_group", "delete_access_control_allow_group", oa.allow_groups, na.allow_groups);
    diffMulti(ops, "set_access_control_deny_user", "delete_access_control_deny_user", oa.deny_users, na.deny_users);
    diffMulti(ops, "set_access_control_deny_group", "delete_access_control_deny_group", oa.deny_groups, na.deny_groups);

    // Dynamic protection
    const od = original.dynamic_protection;
    const nd = next.dynamic_protection;
    if (!nd.enabled && od.enabled) {
      // Removing the parent removes the whole subtree — no child ops needed.
      ops.push({ op: "delete_dynamic_protection" });
    } else if (nd.enabled) {
      if (!od.enabled) ops.push({ op: "set_dynamic_protection" });
      diffMulti(ops, "set_dynamic_protection_allow_from", "delete_dynamic_protection_allow_from", od.allow_from, nd.allow_from);
      diffSingle(ops, "set_dynamic_protection_block_time", "delete_dynamic_protection_block_time", od.block_time, nd.block_time ?? "");
      diffSingle(ops, "set_dynamic_protection_detect_time", "delete_dynamic_protection_detect_time", od.detect_time, nd.detect_time ?? "");
      diffSingle(ops, "set_dynamic_protection_threshold", "delete_dynamic_protection_threshold", od.threshold, nd.threshold ?? "");
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }
}

export const sshService = new SSHService();
