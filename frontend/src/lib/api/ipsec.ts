import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface IPSecProposal {
  number: string;
  encryption?: string | null;
  hash?: string | null;
  dh_group?: string | null;
  prf?: string | null;
}

export interface IKEGroup {
  name: string;
  close_action?: string | null;
  dpd_action?: string | null;
  dpd_interval?: string | null;
  dpd_timeout?: string | null;
  disable_mobike?: boolean;
  ikev2_reauth?: boolean;
  key_exchange?: string | null;
  lifetime?: string | null;
  mode?: string | null;
  proposals: IPSecProposal[];
}

export interface ESPGroup {
  name: string;
  compression?: boolean;
  disable_rekey?: boolean;
  life_bytes?: string | null;
  life_packets?: string | null;
  lifetime?: string | null;
  mode?: string | null;
  pfs?: string | null;
  proposals: IPSecProposal[];
}

export interface S2STunnel {
  number: string;
  disabled?: boolean;
  esp_group?: string | null;
  local_prefix?: string[];
  remote_prefix?: string[];
  local_port?: string | null;
  remote_port?: string | null;
  priority?: string | null;
  protocol?: string | null;
}

export interface S2SPeerAuth {
  mode?: string | null;
  local_id?: string | null;
  remote_id?: string | null;
  use_x509_id?: boolean;
  x509?: {
    ca_certificate?: string[];
    certificate?: string | null;
    passphrase?: string | null;
  };
  rsa?: {
    local_key?: string | null;
    remote_key?: string | null;
    passphrase?: string | null;
  };
}

export interface S2SPeerVti {
  bind?: string | null;
  esp_group?: string | null;
  traffic_selector?: {
    local_prefix?: string[];
    remote_prefix?: string[];
  };
}

export interface SiteToSitePeer {
  name: string;
  description?: string | null;
  disabled?: boolean;
  ike_group?: string | null;
  default_esp_group?: string | null;
  local_address?: string | null;
  remote_address?: string[];
  dhcp_interface?: string | null;
  connection_type?: string | null;
  force_udp_encapsulation?: boolean;
  ikev2_reauth?: boolean;
  replay_window?: string | null;
  virtual_address?: string[];
  authentication?: S2SPeerAuth;
  tunnels: S2STunnel[];
  vti?: S2SPeerVti;
}

export interface RALocalUser {
  username: string;
  password?: string | null;
  disabled?: boolean;
}

export interface RAConnection {
  name: string;
  description?: string | null;
  disabled?: boolean;
  esp_group?: string | null;
  ike_group?: string | null;
  local_address?: string | null;
  dhcp_interface?: string | null;
  pools?: string[];
  replay_window?: string | null;
  timeout?: string | null;
  unique?: string | null;
  local_prefix?: string[];
  local_port?: string | null;
  bind?: string | null;
  childless?: boolean;
  auth_server_mode?: string | null;
  auth_client_mode?: string | null;
  auth_local_id?: string | null;
  auth_eap_id?: string | null;
  auth_psk?: string | null;
  auth_always_send_cert?: boolean;
  auth_x509_ca_cert?: string | null;
  auth_x509_cert?: string | null;
  auth_x509_passphrase?: string | null;
  auth_ppk_id?: string | null;
  auth_ppk_required?: boolean;
  local_users: RALocalUser[];
}

export interface RAPool {
  name: string;
  prefix?: string[];
  name_servers?: string[];
  exclude?: string[];
  range_start?: string | null;
  range_stop?: string | null;
}

export interface RARadius {
  nas_identifier?: string | null;
  timeout?: string | null;
  servers?: Array<{
    address: string;
    key?: string | null;
    port?: string | null;
    disabled?: boolean;
    disable_accounting?: boolean;
  }>;
}

export interface AuthPSK {
  name: string;
  identities?: string[];
  secret?: string | null;
  secret_type?: string | null;
  dhcp_interface?: string | null;
}

export interface IPSecProfile {
  name: string;
  disabled?: boolean;
  ike_group?: string | null;
  esp_group?: string | null;
  auth_mode?: string | null;
  auth_psk?: string | null;
  bind_tunnels?: string[];
}

export interface IPSecOptions {
  disable_route_autoinstall?: boolean;
  flexvpn?: boolean;
  interface?: string[];
  virtual_ip?: boolean;
  retransmission_attempts?: string | null;
  retransmission_base?: string | null;
  retransmission_timeout?: string | null;
}

export interface IPSecLog {
  level?: string | null;
  subsystems?: string[];
}

export interface IPSecConfigResponse {
  ike_groups: IKEGroup[];
  esp_groups: ESPGroup[];
  site_to_site_peers: SiteToSitePeer[];
  remote_access: {
    connections: RAConnection[];
    pools: RAPool[];
    radius: RARadius;
    dhcp: Record<string, unknown>;
  };
  profiles: IPSecProfile[];
  authentication: {
    psk: AuthPSK[];
  };
  options: IPSecOptions;
  log: IPSecLog;
  interfaces: string[];
  disable_uniqreqids: boolean;
  totals: {
    ike_groups: number;
    esp_groups: number;
    site_to_site_peers: number;
    remote_access_connections: number;
    remote_access_pools: number;
    profiles: number;
  };
}

export interface IPSecCapabilities {
  version: string;
  features: {
    ipsec: { supported: boolean; description: string };
    site_to_site: { supported: boolean; description: string };
    remote_access: { supported: boolean; description: string };
    ike_groups: { supported: boolean; description: string };
    esp_groups: { supported: boolean; description: string };
    profiles: { supported: boolean; description: string };
    ppk: { supported: boolean; description: string };
    retransmission_options: { supported: boolean; description: string };
    childless: { supported: boolean; description: string };
    pool_range: { supported: boolean; description: string };
    connection_bind: { supported: boolean; description: string };
    always_send_cert: { supported: boolean; description: string };
  };
  version_notes: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class IPSecService {
  async getCapabilities(): Promise<IPSecCapabilities> {
    return apiClient.get<IPSecCapabilities>("/vyos/vpn/ipsec/capabilities");
  }

  async getConfig(refresh = false): Promise<IPSecConfigResponse> {
    return apiClient.get<IPSecConfigResponse>("/vyos/vpn/ipsec/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/ipsec/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // IKE Group Operations
  // ==========================================================================

  async createIKEGroup(name: string, config: {
    key_exchange?: string;
    lifetime?: string;
    mode?: string;
    close_action?: string;
    dpd_action?: string;
    dpd_interval?: string;
    dpd_timeout?: string;
    disable_mobike?: boolean;
    ikev2_reauth?: boolean;
    proposals?: Array<{ number: string; encryption?: string; hash?: string; dh_group?: string; prf?: string }>;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_ike_group" }];
    if (config.key_exchange) ops.push({ op: "set_ike_group_key_exchange", value: config.key_exchange });
    if (config.lifetime) ops.push({ op: "set_ike_group_lifetime", value: config.lifetime });
    if (config.mode) ops.push({ op: "set_ike_group_mode", value: config.mode });
    if (config.close_action) ops.push({ op: "set_ike_group_close_action", value: config.close_action });
    if (config.dpd_action) ops.push({ op: "set_ike_group_dpd_action", value: config.dpd_action });
    if (config.dpd_interval) ops.push({ op: "set_ike_group_dpd_interval", value: config.dpd_interval });
    if (config.dpd_timeout) ops.push({ op: "set_ike_group_dpd_timeout", value: config.dpd_timeout });
    if (config.disable_mobike) ops.push({ op: "set_ike_group_disable_mobike" });
    if (config.ikev2_reauth) ops.push({ op: "set_ike_group_ikev2_reauth" });
    if (config.proposals) {
      for (const p of config.proposals) {
        ops.push({ op: "create_ike_group_proposal", value: p.number });
        if (p.encryption) ops.push({ op: "set_ike_group_proposal_encryption", value: `${p.number}|${p.encryption}` });
        if (p.hash) ops.push({ op: "set_ike_group_proposal_hash", value: `${p.number}|${p.hash}` });
        if (p.dh_group) ops.push({ op: "set_ike_group_proposal_dh_group", value: `${p.number}|${p.dh_group}` });
        if (p.prf) ops.push({ op: "set_ike_group_proposal_prf", value: `${p.number}|${p.prf}` });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async deleteIKEGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ike_group" }]);
  }

  // ==========================================================================
  // ESP Group Operations
  // ==========================================================================

  async createESPGroup(name: string, config: {
    lifetime?: string;
    mode?: string;
    pfs?: string;
    compression?: boolean;
    disable_rekey?: boolean;
    life_bytes?: string;
    life_packets?: string;
    proposals?: Array<{ number: string; encryption?: string; hash?: string }>;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_esp_group" }];
    if (config.lifetime) ops.push({ op: "set_esp_group_lifetime", value: config.lifetime });
    if (config.mode) ops.push({ op: "set_esp_group_mode", value: config.mode });
    if (config.pfs) ops.push({ op: "set_esp_group_pfs", value: config.pfs });
    if (config.compression) ops.push({ op: "set_esp_group_compression" });
    if (config.disable_rekey) ops.push({ op: "set_esp_group_disable_rekey" });
    if (config.life_bytes) ops.push({ op: "set_esp_group_life_bytes", value: config.life_bytes });
    if (config.life_packets) ops.push({ op: "set_esp_group_life_packets", value: config.life_packets });
    if (config.proposals) {
      for (const p of config.proposals) {
        ops.push({ op: "create_esp_group_proposal", value: p.number });
        if (p.encryption) ops.push({ op: "set_esp_group_proposal_encryption", value: `${p.number}|${p.encryption}` });
        if (p.hash) ops.push({ op: "set_esp_group_proposal_hash", value: `${p.number}|${p.hash}` });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async deleteESPGroup(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_esp_group" }]);
  }

  // ==========================================================================
  // Site-to-Site Peer Operations
  // ==========================================================================

  async createS2SPeer(name: string, config: {
    ike_group?: string;
    default_esp_group?: string;
    local_address?: string;
    remote_addresses?: string[];
    description?: string;
    connection_type?: string;
    dhcp_interface?: string;
    auth_mode?: string;
    auth_local_id?: string;
    auth_remote_id?: string;
    auth_x509_ca_cert?: string;
    auth_x509_cert?: string;
    auth_x509_passphrase?: string;
    auth_rsa_local_key?: string;
    auth_rsa_remote_key?: string;
    auth_rsa_passphrase?: string;
    force_udp_encapsulation?: boolean;
    vti_bind?: string;
    vti_esp_group?: string;
    vti_ts_local_prefix?: string[];
    vti_ts_remote_prefix?: string[];
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_s2s_peer" }];
    if (config.description) ops.push({ op: "set_s2s_peer_description", value: config.description });
    if (config.ike_group) ops.push({ op: "set_s2s_peer_ike_group", value: config.ike_group });
    if (config.default_esp_group) ops.push({ op: "set_s2s_peer_default_esp_group", value: config.default_esp_group });
    if (config.local_address) ops.push({ op: "set_s2s_peer_local_address", value: config.local_address });
    if (config.remote_addresses) {
      for (const addr of config.remote_addresses) {
        ops.push({ op: "set_s2s_peer_remote_address", value: addr });
      }
    }
    if (config.connection_type) ops.push({ op: "set_s2s_peer_connection_type", value: config.connection_type });
    if (config.dhcp_interface) ops.push({ op: "set_s2s_peer_dhcp_interface", value: config.dhcp_interface });
    if (config.auth_mode) ops.push({ op: "set_s2s_peer_auth_mode", value: config.auth_mode });
    if (config.auth_local_id) ops.push({ op: "set_s2s_peer_auth_local_id", value: config.auth_local_id });
    if (config.auth_remote_id) ops.push({ op: "set_s2s_peer_auth_remote_id", value: config.auth_remote_id });
    if (config.auth_x509_ca_cert) ops.push({ op: "set_s2s_peer_auth_x509_ca_cert", value: config.auth_x509_ca_cert });
    if (config.auth_x509_cert) ops.push({ op: "set_s2s_peer_auth_x509_cert", value: config.auth_x509_cert });
    if (config.auth_x509_passphrase) ops.push({ op: "set_s2s_peer_auth_x509_passphrase", value: config.auth_x509_passphrase });
    if (config.auth_rsa_local_key) ops.push({ op: "set_s2s_peer_auth_rsa_local_key", value: config.auth_rsa_local_key });
    if (config.auth_rsa_remote_key) ops.push({ op: "set_s2s_peer_auth_rsa_remote_key", value: config.auth_rsa_remote_key });
    if (config.auth_rsa_passphrase) ops.push({ op: "set_s2s_peer_auth_rsa_passphrase", value: config.auth_rsa_passphrase });
    if (config.force_udp_encapsulation) ops.push({ op: "set_s2s_peer_force_udp_encapsulation" });
    if (config.vti_bind) ops.push({ op: "set_s2s_peer_vti_bind", value: config.vti_bind });
    if (config.vti_esp_group) ops.push({ op: "set_s2s_peer_vti_esp_group", value: config.vti_esp_group });
    if (config.vti_ts_local_prefix) {
      for (const prefix of config.vti_ts_local_prefix) {
        ops.push({ op: "set_s2s_peer_vti_ts_local_prefix", value: prefix });
      }
    }
    if (config.vti_ts_remote_prefix) {
      for (const prefix of config.vti_ts_remote_prefix) {
        ops.push({ op: "set_s2s_peer_vti_ts_remote_prefix", value: prefix });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async deleteS2SPeer(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_s2s_peer" }]);
  }

  // ==========================================================================
  // S2S Tunnel Operations
  // ==========================================================================

  async createS2STunnel(peerName: string, tunnelNum: string, config: {
    esp_group?: string;
    local_prefix?: string[];
    remote_prefix?: string[];
    protocol?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_s2s_peer_tunnel", value: tunnelNum }];
    if (config.esp_group) ops.push({ op: "set_s2s_peer_tunnel_esp_group", value: `${tunnelNum}|${config.esp_group}` });
    if (config.local_prefix) {
      for (const p of config.local_prefix) {
        ops.push({ op: "set_s2s_peer_tunnel_local_prefix", value: `${tunnelNum}|${p}` });
      }
    }
    if (config.remote_prefix) {
      for (const p of config.remote_prefix) {
        ops.push({ op: "set_s2s_peer_tunnel_remote_prefix", value: `${tunnelNum}|${p}` });
      }
    }
    if (config.protocol) ops.push({ op: "set_s2s_peer_tunnel_protocol", value: `${tunnelNum}|${config.protocol}` });
    return this.batchConfigure(peerName, ops);
  }

  async deleteS2STunnel(peerName: string, tunnelNum: string): Promise<VyOSResponse> {
    return this.batchConfigure(peerName, [{ op: "delete_s2s_peer_tunnel", value: tunnelNum }]);
  }

  // ==========================================================================
  // Remote Access Connection Operations
  // ==========================================================================

  async createRAConnection(name: string, config: {
    esp_group?: string;
    ike_group?: string;
    local_address?: string;
    description?: string;
    pools?: string[];
    auth_server_mode?: string;
    auth_client_mode?: string;
    auth_local_id?: string;
    auth_psk?: string;
    auth_x509_ca_cert?: string;
    auth_x509_cert?: string;
    auth_always_send_cert?: boolean;
    local_users?: { username: string; password?: string; disabled?: boolean }[];
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_ra_connection" }];
    if (config.description) ops.push({ op: "set_ra_connection_description", value: config.description });
    if (config.esp_group) ops.push({ op: "set_ra_connection_esp_group", value: config.esp_group });
    if (config.ike_group) ops.push({ op: "set_ra_connection_ike_group", value: config.ike_group });
    if (config.local_address) ops.push({ op: "set_ra_connection_local_address", value: config.local_address });
    if (config.pools) {
      for (const pool of config.pools) {
        ops.push({ op: "set_ra_connection_pool", value: pool });
      }
    }
    if (config.auth_server_mode) ops.push({ op: "set_ra_connection_auth_server_mode", value: config.auth_server_mode });
    if (config.auth_client_mode) ops.push({ op: "set_ra_connection_auth_client_mode", value: config.auth_client_mode });
    if (config.auth_local_id) ops.push({ op: "set_ra_connection_auth_local_id", value: config.auth_local_id });
    if (config.auth_psk) ops.push({ op: "set_ra_connection_auth_psk", value: config.auth_psk });
    if (config.auth_x509_ca_cert) ops.push({ op: "set_ra_connection_auth_x509_ca_cert", value: config.auth_x509_ca_cert });
    if (config.auth_x509_cert) ops.push({ op: "set_ra_connection_auth_x509_cert", value: config.auth_x509_cert });
    if (config.auth_always_send_cert) ops.push({ op: "set_ra_connection_auth_always_send_cert" });
    if (config.local_users) {
      for (const user of config.local_users) {
        if (!user.username) continue;
        ops.push({ op: "create_ra_connection_auth_local_user", value: user.username });
        if (user.password) ops.push({ op: "set_ra_connection_auth_local_user_password", value: `${user.username}|${user.password}` });
        if (user.disabled) ops.push({ op: "set_ra_connection_auth_local_user_disable", value: user.username });
      }
    }
    return this.batchConfigure(name, ops);
  }

  async updateRAConnection(name: string, config: {
    description?: string;
    esp_group?: string;
    ike_group?: string;
    local_address?: string;
    pools?: string[];
    auth_server_mode?: string;
    auth_client_mode?: string;
    auth_local_id?: string;
    auth_psk?: string;
    auth_x509_ca_cert?: string;
    auth_x509_cert?: string;
    auth_always_send_cert?: boolean;
    local_users?: { username: string; password?: string; disabled?: boolean }[];
  }, existing: RAConnection): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // Single-valued leaf: set (replaces) when changed, delete when cleared.
    const diffLeaf = (setOp: string, deleteOp: string, newVal?: string | null, oldVal?: string | null) => {
      const nv = (newVal || "").trim();
      const ov = (oldVal || "").trim();
      if (nv && nv !== ov) ops.push({ op: setOp, value: nv });
      else if (!nv && ov) ops.push({ op: deleteOp, value: ov });
    };

    diffLeaf("set_ra_connection_description", "delete_ra_connection_description", config.description, existing.description);
    diffLeaf("set_ra_connection_esp_group", "delete_ra_connection_esp_group", config.esp_group, existing.esp_group);
    diffLeaf("set_ra_connection_ike_group", "delete_ra_connection_ike_group", config.ike_group, existing.ike_group);
    diffLeaf("set_ra_connection_local_address", "delete_ra_connection_local_address", config.local_address, existing.local_address);
    diffLeaf("set_ra_connection_auth_server_mode", "delete_ra_connection_auth_server_mode", config.auth_server_mode, existing.auth_server_mode);
    diffLeaf("set_ra_connection_auth_client_mode", "delete_ra_connection_auth_client_mode", config.auth_client_mode, existing.auth_client_mode);
    diffLeaf("set_ra_connection_auth_local_id", "delete_ra_connection_auth_local_id", config.auth_local_id, existing.auth_local_id);
    diffLeaf("set_ra_connection_auth_x509_cert", "delete_ra_connection_auth_x509_cert", config.auth_x509_cert, existing.auth_x509_cert);

    // X.509 CA cert is a multi-value node: replacing requires deleting the old value.
    {
      const nv = (config.auth_x509_ca_cert || "").trim();
      const ov = (existing.auth_x509_ca_cert || "").trim();
      if (ov && ov !== nv) ops.push({ op: "delete_ra_connection_auth_x509_ca_cert", value: ov });
      if (nv && nv !== ov) ops.push({ op: "set_ra_connection_auth_x509_ca_cert", value: nv });
    }

    // Pools (multi-value): reconcile add/remove.
    {
      const oldPools = existing.pools || [];
      const newPools = config.pools || [];
      for (const p of oldPools) if (!newPools.includes(p)) ops.push({ op: "delete_ra_connection_pool", value: p });
      for (const p of newPools) if (!oldPools.includes(p)) ops.push({ op: "set_ra_connection_pool", value: p });
    }

    // PSK is never returned by the API, so only set it when the user typed one;
    // leaving it blank preserves the existing key.
    if (config.auth_psk) ops.push({ op: "set_ra_connection_auth_psk", value: config.auth_psk });

    // always-send-cert flag.
    if (config.auth_always_send_cert && !existing.auth_always_send_cert) {
      ops.push({ op: "set_ra_connection_auth_always_send_cert" });
    } else if (!config.auth_always_send_cert && existing.auth_always_send_cert) {
      ops.push({ op: "delete_ra_connection_auth_always_send_cert" });
    }

    // Local users (multi-value): reconcile add/remove + password/disable.
    {
      const oldUsers = existing.local_users || [];
      const newUsers = (config.local_users || []).filter((u) => u.username);
      const oldByName = new Map(oldUsers.map((u) => [u.username, u]));
      const newNames = new Set(newUsers.map((u) => u.username));
      for (const u of oldUsers) if (!newNames.has(u.username)) ops.push({ op: "delete_ra_connection_auth_local_user", value: u.username });
      for (const u of newUsers) {
        const old = oldByName.get(u.username);
        if (!old) ops.push({ op: "create_ra_connection_auth_local_user", value: u.username });
        if (u.password) ops.push({ op: "set_ra_connection_auth_local_user_password", value: `${u.username}|${u.password}` });
        if (u.disabled && !old?.disabled) ops.push({ op: "set_ra_connection_auth_local_user_disable", value: u.username });
        else if (!u.disabled && old?.disabled) ops.push({ op: "delete_ra_connection_auth_local_user_disable", value: u.username });
      }
    }

    return this.batchConfigure(name, ops);
  }

  async deleteRAConnection(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ra_connection" }]);
  }

  // ==========================================================================
  // Remote Access Pool Operations
  // ==========================================================================

  async createRAPool(name: string, config: {
    prefix?: string[];
    name_servers?: string[];
    exclude?: string[];
    range_start?: string;
    range_stop?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_ra_pool" }];
    if (config.prefix) {
      for (const p of config.prefix) {
        ops.push({ op: "set_ra_pool_prefix", value: p });
      }
    }
    if (config.name_servers) {
      for (const ns of config.name_servers) {
        ops.push({ op: "set_ra_pool_name_server", value: ns });
      }
    }
    if (config.exclude) {
      for (const ex of config.exclude) {
        ops.push({ op: "set_ra_pool_exclude", value: ex });
      }
    }
    if (config.range_start) ops.push({ op: "set_ra_pool_range_start", value: config.range_start });
    if (config.range_stop) ops.push({ op: "set_ra_pool_range_stop", value: config.range_stop });
    return this.batchConfigure(name, ops);
  }

  async deleteRAPool(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ra_pool" }]);
  }

  // ==========================================================================
  // Authentication PSK Operations
  // ==========================================================================

  async createAuthPSK(name: string, config: {
    identities?: string[];
    secret?: string;
    secret_type?: string;
    dhcp_interface?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_auth_psk" }];
    if (config.identities) {
      for (const id of config.identities) {
        ops.push({ op: "set_auth_psk_id", value: id });
      }
    }
    if (config.secret) ops.push({ op: "set_auth_psk_secret", value: config.secret });
    if (config.secret_type) ops.push({ op: "set_auth_psk_secret_type", value: config.secret_type });
    if (config.dhcp_interface) ops.push({ op: "set_auth_psk_dhcp_interface", value: config.dhcp_interface });
    return this.batchConfigure(name, ops);
  }

  async deleteAuthPSK(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_auth_psk" }]);
  }

  // ==========================================================================
  // Profile Operations
  // ==========================================================================

  async deleteProfile(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_profile" }]);
  }

  // ==========================================================================
  // Generic batch executor
  // ==========================================================================

  async executeBatch(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    return this.batchConfigure(itemName, operations);
  }
}

export const ipsecService = new IPSecService();
