import { apiClient } from "./client";

// ============================================================================
// Config types (mirror backend Pydantic models)
// ============================================================================

export interface SNMPListenAddress {
  address: string;
  port: string | null;
}

export interface SNMPCommunity {
  name: string;
  authorization: string | null; // ro | rw
  clients: string[];
  networks: string[];
}

export interface SNMPScriptExtension {
  name: string;
  script: string | null;
}

export interface SNMPTrapTarget {
  address: string;
  community: string | null;
  port: string | null;
}

export interface SNMPv3Auth {
  type: string | null; // md5 | sha
  plaintext_password: string | null;
  encrypted_password: string | null;
}

export interface SNMPv3Privacy {
  type: string | null; // des | aes
  plaintext_password: string | null;
  encrypted_password: string | null;
}

export interface SNMPv3Group {
  name: string;
  mode: string | null; // ro | rw
  seclevel: string | null; // noauth | auth | priv
  view: string | null;
}

export interface SNMPv3User {
  name: string;
  group: string | null;
  mode: string | null; // ro | rw
  auth: SNMPv3Auth | null;
  privacy: SNMPv3Privacy | null;
}

export interface SNMPv3ViewOid {
  oid: string;
  mask: string | null;
  exclude: string[];
}

export interface SNMPv3View {
  name: string;
  oids: SNMPv3ViewOid[];
}

export interface SNMPv3TrapTarget {
  address: string;
  user: string | null;
  type: string | null; // inform | trap
  protocol: string | null; // udp | tcp
  port: string | null;
  auth: SNMPv3Auth | null;
  privacy: SNMPv3Privacy | null;
}

export interface SNMPv3 {
  engineid: string | null;
  groups: SNMPv3Group[];
  users: SNMPv3User[];
  views: SNMPv3View[];
  trap_targets: SNMPv3TrapTarget[];
}

export interface SNMPConfig {
  contact: string | null;
  description: string | null;
  location: string | null;
  protocol: string | null; // udp | tcp
  trap_source: string | null;
  vrf: string | null;
  smux_peers: string[];
  oid_enable: string[];
  listen_addresses: SNMPListenAddress[];
  communities: SNMPCommunity[];
  mib_interfaces: string[];
  mib_interface_max: string | null;
  script_extensions: SNMPScriptExtension[];
  trap_targets: SNMPTrapTarget[];
  v3: SNMPv3;
}

export interface SNMPCapabilities {
  version: string;
  features: {
    snmp: { supported: boolean; description: string };
    protocol: { supported: boolean; description: string; values: string[]; default: string };
    oid_enable: { supported: boolean; description: string; multi_value: boolean; values: string[] };
    smux_peer: { supported: boolean; description: string; multi_value: boolean };
    listen_address: { supported: boolean; description: string; default_port: string };
    community: {
      supported: boolean;
      description: string;
      authorization_values: string[];
      default_authorization: string;
    };
    mib: { supported: boolean; description: string; interface_prefixes: string[] };
    script_extensions: { supported: boolean; description: string };
    trap_target: { supported: boolean; description: string; default_port: string };
    v3: {
      supported: boolean;
      description: string;
      auth_types: string[];
      privacy_types: string[];
      mode_values: string[];
      seclevel_values: string[];
      trap_type_values: string[];
      trap_protocol_values: string[];
      default_trap_port: string;
    };
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
// Update payload types
// ============================================================================

export interface SNMPGeneralUpdate {
  original: SNMPConfig;
  contact: string;
  description: string;
  location: string;
  protocol: string; // "" = default (udp)
  trapSource: string;
  vrf: string;
  engineid: string;
  smuxPeers: string[];
  oidEnable: string[];
  mibInterfaces: string[];
  mibInterfaceMax: string;
}

export interface SNMPListenAddressUpdate {
  address: string;
  port: string; // "" = default (161)
}

export interface SNMPCommunityUpdate {
  name: string;
  authorization: string; // "" = default (ro)
  clients: string[];
  networks: string[];
}

export interface SNMPTrapTargetUpdate {
  address: string;
  community: string;
  port: string; // "" = default (162)
}

export interface SNMPScriptExtensionUpdate {
  name: string;
  script: string; // "" = none
}

export interface SNMPv3CredentialUpdate {
  type: string; // "" = unset
  passwordMode: "plaintext" | "encrypted";
  password: string; // "" = unchanged (edit) / unset (create)
}

export interface SNMPv3UserUpdate {
  name: string;
  group: string;
  mode: string; // "" = default
  authEnabled: boolean;
  auth: SNMPv3CredentialUpdate;
  privacyEnabled: boolean;
  privacy: SNMPv3CredentialUpdate;
}

export interface SNMPv3GroupUpdate {
  name: string;
  mode: string; // "" = default (ro)
  seclevel: string; // "" = default (auth)
  view: string;
}

export interface SNMPv3ViewUpdate {
  name: string;
  oids: SNMPv3ViewOid[];
}

export interface SNMPv3TrapTargetUpdate {
  address: string;
  user: string;
  type: string; // "" = default (inform)
  protocol: string; // "" = default (udp)
  port: string; // "" = default (162)
  authEnabled: boolean;
  auth: SNMPv3CredentialUpdate;
  privacyEnabled: boolean;
  privacy: SNMPv3CredentialUpdate;
}

// ============================================================================
// Helpers
// ============================================================================

/** Build set/delete ops for a single-value field that may be cleared. */
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

/** Build set/delete ops for a single-value field scoped to one entity (e.g. "addr"). */
function diffSingleScoped(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  scope: string,
  oldVal: string | null | undefined,
  newVal: string
): void {
  const o = oldVal ?? "";
  if (newVal === o) return;
  if (newVal === "") ops.push({ op: deleteOp, value: scope });
  else ops.push({ op: setOp, value: `${scope},${newVal}` });
}

/** Build set/delete ops for a scoped multi-value list (e.g. community clients). */
function diffMultiScoped(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  scope: string,
  oldVals: string[],
  newVals: string[]
): void {
  for (const v of oldVals.filter((x) => !newVals.includes(x))) {
    ops.push({ op: deleteOp, value: `${scope},${v}` });
  }
  for (const v of newVals.filter((x) => !oldVals.includes(x))) {
    ops.push({ op: setOp, value: `${scope},${v}` });
  }
}

/** Build set/delete ops for a global multi-value list. */
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

// ============================================================================
// Service
// ============================================================================

class SNMPService {
  async getCapabilities(): Promise<SNMPCapabilities> {
    return apiClient.get<SNMPCapabilities>("/vyos/snmp/capabilities");
  }

  async getConfig(refresh = false): Promise<SNMPConfig> {
    return apiClient.get<SNMPConfig>("/vyos/snmp/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/snmp/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  // -------------------------------------------------------------- General
  async updateGeneral(u: SNMPGeneralUpdate): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const o = u.original;

    diffSingle(ops, "set_contact", "delete_contact", o.contact, u.contact.trim());
    diffSingle(ops, "set_description", "delete_description", o.description, u.description.trim());
    diffSingle(ops, "set_location", "delete_location", o.location, u.location.trim());
    diffSingle(ops, "set_protocol", "delete_protocol", o.protocol, u.protocol);
    diffSingle(ops, "set_trap_source", "delete_trap_source", o.trap_source, u.trapSource.trim());
    diffSingle(ops, "set_vrf", "delete_vrf", o.vrf, u.vrf.trim());
    diffSingle(ops, "set_v3_engineid", "delete_v3_engineid", o.v3.engineid, u.engineid.trim());
    diffSingle(
      ops,
      "set_mib_interface_max",
      "delete_mib_interface_max",
      o.mib_interface_max,
      u.mibInterfaceMax.trim()
    );

    diffMulti(ops, "set_smux_peer", "delete_smux_peer", o.smux_peers, u.smuxPeers);
    diffMulti(ops, "set_oid_enable", "delete_oid_enable", o.oid_enable, u.oidEnable);
    diffMulti(ops, "set_mib_interface", "delete_mib_interface", o.mib_interfaces, u.mibInterfaces);

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  // ------------------------------------------------------- Listen address
  async saveListenAddress(
    original: SNMPListenAddress | null,
    u: SNMPListenAddressUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const addr = u.address.trim();
    if (original === null) ops.push({ op: "set_listen_address", value: addr });
    diffSingleScoped(
      ops,
      "set_listen_address_port",
      "delete_listen_address_port",
      addr,
      original?.port,
      u.port.trim()
    );
    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteListenAddress(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_listen_address", value: address }]);
  }

  // ----------------------------------------------------------- Community
  async saveCommunity(
    original: SNMPCommunity | null,
    u: SNMPCommunityUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = u.name.trim();
    if (original === null) ops.push({ op: "set_community", value: name });

    diffSingleScoped(
      ops,
      "set_community_authorization",
      "delete_community_authorization",
      name,
      original?.authorization,
      u.authorization
    );
    diffMultiScoped(
      ops,
      "set_community_client",
      "delete_community_client",
      name,
      original?.clients ?? [],
      u.clients
    );
    diffMultiScoped(
      ops,
      "set_community_network",
      "delete_community_network",
      name,
      original?.networks ?? [],
      u.networks
    );

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteCommunity(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_community", value: name }]);
  }

  // -------------------------------------------- Trap target (v1/v2c)
  async saveTrapTarget(
    original: SNMPTrapTarget | null,
    u: SNMPTrapTargetUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const addr = u.address.trim();
    if (original === null) ops.push({ op: "set_trap_target", value: addr });

    diffSingleScoped(
      ops,
      "set_trap_target_community",
      "delete_trap_target_community",
      addr,
      original?.community,
      u.community.trim()
    );
    diffSingleScoped(
      ops,
      "set_trap_target_port",
      "delete_trap_target_port",
      addr,
      original?.port,
      u.port.trim()
    );

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteTrapTarget(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_trap_target", value: address }]);
  }

  // -------------------------------------------------- Script extension
  async saveScriptExtension(
    original: SNMPScriptExtension | null,
    u: SNMPScriptExtensionUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = u.name.trim();
    if (original === null) ops.push({ op: "set_script_extension", value: name });
    diffSingleScoped(
      ops,
      "set_script_extension_script",
      "delete_script_extension_script",
      name,
      original?.script,
      u.script.trim()
    );
    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteScriptExtension(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_script_extension", value: name }]);
  }

  // ----------------------------------------------------------- v3 user
  async saveV3User(
    original: SNMPv3User | null,
    u: SNMPv3UserUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = u.name.trim();
    if (original === null) ops.push({ op: "set_v3_user", value: name });

    diffSingleScoped(ops, "set_v3_user_group", "delete_v3_user_group", name, original?.group, u.group.trim());
    diffSingleScoped(ops, "set_v3_user_mode", "delete_v3_user_mode", name, original?.mode, u.mode);

    this.diffCredential(
      ops,
      name,
      "v3_user_auth",
      original?.auth ?? null,
      u.authEnabled ? u.auth : null
    );
    this.diffCredential(
      ops,
      name,
      "v3_user_privacy",
      original?.privacy ?? null,
      u.privacyEnabled ? u.privacy : null
    );

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteV3User(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_v3_user", value: name }]);
  }

  // ---------------------------------------------------------- v3 group
  async saveV3Group(
    original: SNMPv3Group | null,
    u: SNMPv3GroupUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = u.name.trim();
    if (original === null) ops.push({ op: "set_v3_group", value: name });

    diffSingleScoped(ops, "set_v3_group_mode", "delete_v3_group_mode", name, original?.mode, u.mode);
    diffSingleScoped(ops, "set_v3_group_seclevel", "delete_v3_group_seclevel", name, original?.seclevel, u.seclevel);
    diffSingleScoped(ops, "set_v3_group_view", "delete_v3_group_view", name, original?.view, u.view.trim());

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteV3Group(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_v3_group", value: name }]);
  }

  // ----------------------------------------------------------- v3 view
  async saveV3View(
    original: SNMPv3View | null,
    u: SNMPv3ViewUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = u.name.trim();
    if (original === null) ops.push({ op: "set_v3_view", value: name });

    const origOids = original?.oids ?? [];
    const newOidKeys = u.oids.map((o) => o.oid);

    // Removed OIDs
    for (const o of origOids.filter((x) => !newOidKeys.includes(x.oid))) {
      ops.push({ op: "delete_v3_view_oid", value: `${name},${o.oid}` });
    }
    // Added / changed OIDs
    for (const oid of u.oids) {
      const prev = origOids.find((x) => x.oid === oid.oid) ?? null;
      if (prev === null) ops.push({ op: "set_v3_view_oid", value: `${name},${oid.oid}` });
      // mask
      diffSingleScoped(
        ops,
        "set_v3_view_oid_mask",
        "delete_v3_view_oid_mask",
        `${name},${oid.oid}`,
        prev?.mask,
        (oid.mask ?? "").trim()
      );
      // excludes (scoped to view,oid)
      diffMultiScoped(
        ops,
        "set_v3_view_oid_exclude",
        "delete_v3_view_oid_exclude",
        `${name},${oid.oid}`,
        prev?.exclude ?? [],
        oid.exclude
      );
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteV3View(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_v3_view", value: name }]);
  }

  // -------------------------------------------------- v3 trap target
  async saveV3TrapTarget(
    original: SNMPv3TrapTarget | null,
    u: SNMPv3TrapTargetUpdate
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const addr = u.address.trim();
    if (original === null) ops.push({ op: "set_v3_trap_target", value: addr });

    diffSingleScoped(ops, "set_v3_trap_target_user", "delete_v3_trap_target_user", addr, original?.user, u.user.trim());
    diffSingleScoped(ops, "set_v3_trap_target_type", "delete_v3_trap_target_type", addr, original?.type, u.type);
    diffSingleScoped(ops, "set_v3_trap_target_protocol", "delete_v3_trap_target_protocol", addr, original?.protocol, u.protocol);
    diffSingleScoped(ops, "set_v3_trap_target_port", "delete_v3_trap_target_port", addr, original?.port, u.port.trim());

    this.diffCredential(
      ops,
      addr,
      "v3_trap_target_auth",
      original?.auth ?? null,
      u.authEnabled ? u.auth : null
    );
    this.diffCredential(
      ops,
      addr,
      "v3_trap_target_privacy",
      original?.privacy ?? null,
      u.privacyEnabled ? u.privacy : null
    );

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteV3TrapTarget(address: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_v3_trap_target", value: address }]);
  }

  // ----------------------------------------------------------- internal
  /**
   * Diff an auth/privacy credential block. `prefix` is the builder method stem,
   * e.g. "v3_user_auth" -> set_v3_user_auth_type / *_plaintext_password / ...
   * Passwords are only written when a (non-empty) new value is supplied, since
   * VyOS hashes plaintext on commit and never returns it for comparison.
   */
  private diffCredential(
    ops: BatchOperation[],
    scope: string,
    prefix: string,
    original: SNMPv3Auth | SNMPv3Privacy | null,
    next: SNMPv3CredentialUpdate | null
  ): void {
    // Disabling the credential block entirely.
    if (next === null) {
      if (original?.type) ops.push({ op: `delete_${prefix}_type`, value: scope });
      if (original?.plaintext_password)
        ops.push({ op: `delete_${prefix}_plaintext_password`, value: scope });
      if (original?.encrypted_password)
        ops.push({ op: `delete_${prefix}_encrypted_password`, value: scope });
      return;
    }

    diffSingleScoped(
      ops,
      `set_${prefix}_type`,
      `delete_${prefix}_type`,
      scope,
      original?.type,
      next.type
    );

    const pw = next.password.trim();
    if (pw !== "") {
      if (next.passwordMode === "plaintext") {
        ops.push({ op: `set_${prefix}_plaintext_password`, value: `${scope},${pw}` });
        if (original?.encrypted_password)
          ops.push({ op: `delete_${prefix}_encrypted_password`, value: scope });
      } else {
        ops.push({ op: `set_${prefix}_encrypted_password`, value: `${scope},${pw}` });
        if (original?.plaintext_password)
          ops.push({ op: `delete_${prefix}_plaintext_password`, value: scope });
      }
    }
  }
}

export const snmpService = new SNMPService();
