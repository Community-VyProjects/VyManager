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

// ---- Live operational status (dashboard SSE + page refresh) ----

export interface IPSecNegotiatedProposal {
  cipher?: string | null;     // e.g. "AES"
  mode?: string | null;       // e.g. "CBC"
  key_size?: string | null;   // e.g. "256"
  hash?: string | null;       // e.g. "HMAC_SHA2_256_128"
  dh?: string | null;         // e.g. "MODP_2048"
}

export interface IPSecTunnelStatus {
  name: string | null;        // e.g. "peer5-tunnel-0"
  state: string | null;       // "up" / "down"
  local_ts: string[];
  remote_ts: string[];
  bytes_in?: string | null;
  bytes_out?: string | null;
  packets_in?: string | null;
  packets_out?: string | null;
  esp_proposal?: IPSecNegotiatedProposal | null;
}

export interface IPSecStatus {
  tunnels: IPSecTunnelStatus[];
  total: number;
  up: number;
  down: number;
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
  ppk?: {
    id?: string | null;
    required?: boolean;
  };
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
  unique?: string | null;
  childless?: string | null;
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
  servers?: Record<string, {
    address?: string;
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
  features: {
    ipsec: { supported: boolean; description: string };
    site_to_site: {
      supported: boolean;
      description: string;
      connection_types: string[];
      unique: boolean;
      unique_values: string[];
      childless: boolean;
      childless_values: string[];
      ppk: boolean;
    };
    remote_access: { supported: boolean; description: string };
    ike_groups: { supported: boolean; description: string };
    esp_groups: { supported: boolean; description: string };
    retransmission_options: { supported: boolean; description: string };
    pool_range: { supported: boolean; description: string };
    always_send_cert: { supported: boolean; description: string };
  };
}

/** Config responses replace a secret with this. It is never written back. */
const MASKED_SECRET = "***";

function writableSecret(value?: string | null): string | undefined {
  if (!value || value === MASKED_SECRET) return undefined;
  return value;
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
    auth_x509_ca_certs?: string[];
    auth_x509_cert?: string;
    auth_x509_passphrase?: string;
    auth_rsa_local_key?: string;
    auth_rsa_remote_key?: string;
    auth_rsa_passphrase?: string;
    force_udp_encapsulation?: boolean;
    disabled?: boolean;
    ikev2_reauth?: boolean;
    replay_window?: string;
    virtual_addresses?: string[];
    use_x509_id?: boolean;
    unique?: string;
    childless?: string;
    ppk_id?: string;
    ppk_required?: boolean;
    vti_bind?: string;
    vti_esp_group?: string;
    vti_ts_local_prefix?: string[];
    vti_ts_remote_prefix?: string[];
    tunnels?: Array<{
      number: string;
      esp_group?: string;
      local_prefix?: string[];
      remote_prefix?: string[];
      protocol?: string;
      disabled?: boolean;
      local_port?: string;
      remote_port?: string;
      priority?: string;
    }>;
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
    if (config.auth_x509_ca_certs) {
      for (const ca of config.auth_x509_ca_certs) {
        ops.push({ op: "set_s2s_peer_auth_x509_ca_cert", value: ca });
      }
    }
    if (config.auth_x509_cert) ops.push({ op: "set_s2s_peer_auth_x509_cert", value: config.auth_x509_cert });
    if (writableSecret(config.auth_x509_passphrase)) ops.push({ op: "set_s2s_peer_auth_x509_passphrase", value: writableSecret(config.auth_x509_passphrase) });
    if (config.auth_rsa_local_key) ops.push({ op: "set_s2s_peer_auth_rsa_local_key", value: config.auth_rsa_local_key });
    if (config.auth_rsa_remote_key) ops.push({ op: "set_s2s_peer_auth_rsa_remote_key", value: config.auth_rsa_remote_key });
    if (writableSecret(config.auth_rsa_passphrase)) ops.push({ op: "set_s2s_peer_auth_rsa_passphrase", value: writableSecret(config.auth_rsa_passphrase) });
    if (config.force_udp_encapsulation) ops.push({ op: "set_s2s_peer_force_udp_encapsulation" });
    if (config.disabled) ops.push({ op: "set_s2s_peer_disable" });
    if (config.ikev2_reauth) ops.push({ op: "set_s2s_peer_ikev2_reauth" });
    if (config.replay_window) ops.push({ op: "set_s2s_peer_replay_window", value: config.replay_window });
    if (config.virtual_addresses) {
      for (const address of config.virtual_addresses) ops.push({ op: "set_s2s_peer_virtual_address", value: address });
    }
    if (config.use_x509_id) ops.push({ op: "set_s2s_peer_auth_use_x509_id" });
    if (config.unique) ops.push({ op: "set_s2s_peer_unique", value: config.unique });
    if (config.childless) ops.push({ op: "set_s2s_peer_childless", value: config.childless });
    if (config.ppk_id) ops.push({ op: "set_s2s_peer_auth_ppk_id", value: config.ppk_id });
    if (config.ppk_required) ops.push({ op: "set_s2s_peer_auth_ppk_required" });
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
    // Append tunnel operations so the peer and its tunnels are committed in a
    // single atomic batch. A site-to-site peer without a tunnel (or VTI) is
    // rejected by VyOS with a 400, so they must not be committed separately.
    if (config.tunnels) {
      for (const tunnel of config.tunnels) {
        ops.push(...this.buildS2STunnelOps(tunnel.number, tunnel));
      }
    }
    return this.batchConfigure(name, ops);
  }

  async updateS2SPeer(name: string, config: {
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
    auth_x509_ca_certs?: string[];
    auth_x509_cert?: string;
    auth_x509_passphrase?: string;
    auth_rsa_local_key?: string;
    auth_rsa_remote_key?: string;
    auth_rsa_passphrase?: string;
    force_udp_encapsulation?: boolean;
    disabled?: boolean;
    ikev2_reauth?: boolean;
    replay_window?: string;
    virtual_addresses?: string[];
    use_x509_id?: boolean;
    unique?: string;
    childless?: string;
    ppk_id?: string;
    ppk_required?: boolean;
    vti_bind?: string;
    vti_esp_group?: string;
    vti_ts_local_prefix?: string[];
    vti_ts_remote_prefix?: string[];
    tunnels?: Array<{
      number: string;
      esp_group?: string;
      local_prefix?: string[];
      remote_prefix?: string[];
      protocol?: string;
      disabled?: boolean;
      local_port?: string;
      remote_port?: string;
      priority?: string;
    }>;
  }, existing: SiteToSitePeer): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_s2s_peer" }];
    const drop = (op: string, value?: string) => {
      ops.push(value === undefined ? { op } : { op, value });
    };
    const text = (value?: string | null) => (value || "").trim();
    const leaf = (setOp: string, deleteOp: string, next?: string, prev?: string | null) => {
      const nv = text(next);
      const ov = text(prev);
      if (!nv && ov) drop(deleteOp);
      else if (nv && nv !== ov) ops.push({ op: setOp, value: nv });
    };
    const secret = (setOp: string, deleteOp: string, next?: string, prev?: string | null) => {
      if (next === MASKED_SECRET) return;
      const nv = writableSecret(next);
      if (!nv && text(prev)) drop(deleteOp);
      else if (nv) ops.push({ op: setOp, value: nv });
    };
    const multi = (
      setOp: string,
      deleteOp: string,
      next: string[] = [],
      prev: string[] = [],
      join = "",
    ) => {
      for (const old of prev) {
        if (!next.includes(old)) drop(deleteOp, join ? `${join}|${old}` : old);
      }
      for (const item of next) {
        if (!prev.includes(item)) ops.push({ op: setOp, value: join ? `${join}|${item}` : item });
      }
    };

    leaf("set_s2s_peer_description", "delete_s2s_peer_description", config.description, existing.description);
    if (config.ike_group && config.ike_group !== existing.ike_group) {
      ops.push({ op: "set_s2s_peer_ike_group", value: config.ike_group });
    }
    leaf("set_s2s_peer_default_esp_group", "delete_s2s_peer_default_esp_group", config.default_esp_group, existing.default_esp_group);
    leaf("set_s2s_peer_local_address", "delete_s2s_peer_local_address", config.local_address, existing.local_address);
    leaf("set_s2s_peer_dhcp_interface", "delete_s2s_peer_dhcp_interface", config.dhcp_interface, existing.dhcp_interface);
    if (config.connection_type && config.connection_type !== existing.connection_type) {
      ops.push({ op: "set_s2s_peer_connection_type", value: config.connection_type });
    }
    multi("set_s2s_peer_remote_address", "delete_s2s_peer_remote_address", config.remote_addresses || [], existing.remote_address || []);

    const oldAuth = existing.authentication || {};
    if (config.auth_mode && config.auth_mode !== oldAuth.mode) {
      ops.push({ op: "set_s2s_peer_auth_mode", value: config.auth_mode });
    }
    leaf("set_s2s_peer_auth_local_id", "delete_s2s_peer_auth_local_id", config.auth_local_id, oldAuth.local_id);
    leaf("set_s2s_peer_auth_remote_id", "delete_s2s_peer_auth_remote_id", config.auth_remote_id, oldAuth.remote_id);

    const oldX509 = oldAuth.x509 || {};
    const oldRsa = oldAuth.rsa || {};
    if (config.auth_mode === "x509") {
      multi(
        "set_s2s_peer_auth_x509_ca_cert",
        "delete_s2s_peer_auth_x509_ca_cert",
        config.auth_x509_ca_certs || [],
        oldX509.ca_certificate || [],
      );
      leaf("set_s2s_peer_auth_x509_cert", "delete_s2s_peer_auth_x509_cert", config.auth_x509_cert, oldX509.certificate);
      secret("set_s2s_peer_auth_x509_passphrase", "delete_s2s_peer_auth_x509_passphrase", config.auth_x509_passphrase, oldX509.passphrase);
    } else {
      for (const ca of oldX509.ca_certificate || []) drop("delete_s2s_peer_auth_x509_ca_cert", ca);
      if (oldX509.certificate) drop("delete_s2s_peer_auth_x509_cert");
      if (oldX509.passphrase) drop("delete_s2s_peer_auth_x509_passphrase");
    }
    if (config.auth_mode === "rsa") {
      leaf("set_s2s_peer_auth_rsa_local_key", "delete_s2s_peer_auth_rsa_local_key", config.auth_rsa_local_key, oldRsa.local_key);
      leaf("set_s2s_peer_auth_rsa_remote_key", "delete_s2s_peer_auth_rsa_remote_key", config.auth_rsa_remote_key, oldRsa.remote_key);
      secret("set_s2s_peer_auth_rsa_passphrase", "delete_s2s_peer_auth_rsa_passphrase", config.auth_rsa_passphrase, oldRsa.passphrase);
    } else {
      if (oldRsa.local_key) drop("delete_s2s_peer_auth_rsa_local_key");
      if (oldRsa.remote_key) drop("delete_s2s_peer_auth_rsa_remote_key");
      if (oldRsa.passphrase) drop("delete_s2s_peer_auth_rsa_passphrase");
    }

    if (config.force_udp_encapsulation && !existing.force_udp_encapsulation) {
      ops.push({ op: "set_s2s_peer_force_udp_encapsulation" });
    } else if (!config.force_udp_encapsulation && existing.force_udp_encapsulation) {
      drop("delete_s2s_peer_force_udp_encapsulation");
    }
    const flag = (setOp: string, deleteOp: string, next?: boolean, prev?: boolean) => {
      if (next && !prev) ops.push({ op: setOp });
      else if (!next && prev) drop(deleteOp);
    };
    flag("set_s2s_peer_disable", "delete_s2s_peer_disable", config.disabled, existing.disabled);
    flag("set_s2s_peer_ikev2_reauth", "delete_s2s_peer_ikev2_reauth", config.ikev2_reauth, existing.ikev2_reauth);
    flag("set_s2s_peer_auth_use_x509_id", "delete_s2s_peer_auth_use_x509_id", config.use_x509_id, oldAuth.use_x509_id);
    flag("set_s2s_peer_auth_ppk_required", "delete_s2s_peer_auth_ppk_required", config.ppk_required, oldAuth.ppk?.required);
    leaf("set_s2s_peer_replay_window", "delete_s2s_peer_replay_window", config.replay_window, existing.replay_window);
    leaf("set_s2s_peer_unique", "delete_s2s_peer_unique", config.unique, existing.unique);
    leaf("set_s2s_peer_childless", "delete_s2s_peer_childless", config.childless, existing.childless);
    leaf("set_s2s_peer_auth_ppk_id", "delete_s2s_peer_auth_ppk_id", config.ppk_id, oldAuth.ppk?.id);
    multi("set_s2s_peer_virtual_address", "delete_s2s_peer_virtual_address", config.virtual_addresses || [], existing.virtual_address || []);

    const oldVti = existing.vti || {};
    if (config.vti_bind) {
      leaf("set_s2s_peer_vti_bind", "delete_s2s_peer_vti_bind", config.vti_bind, oldVti.bind);
      leaf("set_s2s_peer_vti_esp_group", "delete_s2s_peer_vti_esp_group", config.vti_esp_group, oldVti.esp_group);
      multi("set_s2s_peer_vti_ts_local_prefix", "delete_s2s_peer_vti_ts_local_prefix", config.vti_ts_local_prefix || [], oldVti.traffic_selector?.local_prefix || []);
      multi("set_s2s_peer_vti_ts_remote_prefix", "delete_s2s_peer_vti_ts_remote_prefix", config.vti_ts_remote_prefix || [], oldVti.traffic_selector?.remote_prefix || []);
    } else {
      if (oldVti.bind) drop("delete_s2s_peer_vti_bind");
      if (oldVti.esp_group) drop("delete_s2s_peer_vti_esp_group");
      for (const prefix of oldVti.traffic_selector?.local_prefix || []) drop("delete_s2s_peer_vti_ts_local_prefix", prefix);
      for (const prefix of oldVti.traffic_selector?.remote_prefix || []) drop("delete_s2s_peer_vti_ts_remote_prefix", prefix);
    }

    const nextTunnels = config.tunnels || [];
    const kept = new Set(nextTunnels.map((tunnel) => tunnel.number));
    for (const old of existing.tunnels || []) {
      if (!kept.has(old.number)) drop("delete_s2s_peer_tunnel", old.number);
    }
    for (const tunnel of nextTunnels) {
      const old = (existing.tunnels || []).find((item) => item.number === tunnel.number);
      ops.push({ op: "create_s2s_peer_tunnel", value: tunnel.number });
      if (old) {
        multi("set_s2s_peer_tunnel_local_prefix", "delete_s2s_peer_tunnel_local_prefix", tunnel.local_prefix || [], old.local_prefix || [], tunnel.number);
        multi("set_s2s_peer_tunnel_remote_prefix", "delete_s2s_peer_tunnel_remote_prefix", tunnel.remote_prefix || [], old.remote_prefix || [], tunnel.number);
        if (!tunnel.esp_group && old.esp_group) drop("delete_s2s_peer_tunnel_esp_group", tunnel.number);
        else if (tunnel.esp_group && tunnel.esp_group !== old.esp_group) {
          ops.push({ op: "set_s2s_peer_tunnel_esp_group", value: `${tunnel.number}|${tunnel.esp_group}` });
        }
        if (!tunnel.protocol && old.protocol) drop("delete_s2s_peer_tunnel_protocol", tunnel.number);
        else if (tunnel.protocol && tunnel.protocol !== old.protocol) {
          ops.push({ op: "set_s2s_peer_tunnel_protocol", value: `${tunnel.number}|${tunnel.protocol}` });
        }
        if (tunnel.disabled && !old.disabled) ops.push({ op: "set_s2s_peer_tunnel_disable", value: tunnel.number });
        else if (!tunnel.disabled && old.disabled) drop("delete_s2s_peer_tunnel_disable", tunnel.number);
        if (!tunnel.local_port && old.local_port) drop("delete_s2s_peer_tunnel_local_port", tunnel.number);
        else if (tunnel.local_port && tunnel.local_port !== old.local_port) {
          ops.push({ op: "set_s2s_peer_tunnel_local_port", value: `${tunnel.number}|${tunnel.local_port}` });
        }
        if (!tunnel.remote_port && old.remote_port) drop("delete_s2s_peer_tunnel_remote_port", tunnel.number);
        else if (tunnel.remote_port && tunnel.remote_port !== old.remote_port) {
          ops.push({ op: "set_s2s_peer_tunnel_remote_port", value: `${tunnel.number}|${tunnel.remote_port}` });
        }
        if (!tunnel.priority && old.priority) drop("delete_s2s_peer_tunnel_priority", tunnel.number);
        else if (tunnel.priority && tunnel.priority !== old.priority) {
          ops.push({ op: "set_s2s_peer_tunnel_priority", value: `${tunnel.number}|${tunnel.priority}` });
        }
      } else {
        ops.push(...this.buildS2STunnelOps(tunnel.number, tunnel).slice(1));
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

  private buildS2STunnelOps(tunnelNum: string, config: {
    esp_group?: string;
    local_prefix?: string[];
    remote_prefix?: string[];
    protocol?: string;
    disabled?: boolean;
    local_port?: string;
    remote_port?: string;
    priority?: string;
  }): BatchOperation[] {
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
    if (config.disabled) ops.push({ op: "set_s2s_peer_tunnel_disable", value: tunnelNum });
    if (config.local_port) ops.push({ op: "set_s2s_peer_tunnel_local_port", value: `${tunnelNum}|${config.local_port}` });
    if (config.remote_port) ops.push({ op: "set_s2s_peer_tunnel_remote_port", value: `${tunnelNum}|${config.remote_port}` });
    if (config.priority) ops.push({ op: "set_s2s_peer_tunnel_priority", value: `${tunnelNum}|${config.priority}` });
    return ops;
  }

  async createS2STunnel(peerName: string, tunnelNum: string, config: {
    esp_group?: string;
    local_prefix?: string[];
    remote_prefix?: string[];
    protocol?: string;
  }): Promise<VyOSResponse> {
    return this.batchConfigure(peerName, this.buildS2STunnelOps(tunnelNum, config));
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
    if (writableSecret(config.auth_psk)) ops.push({ op: "set_ra_connection_auth_psk", value: writableSecret(config.auth_psk) });
    if (config.auth_x509_ca_cert) ops.push({ op: "set_ra_connection_auth_x509_ca_cert", value: config.auth_x509_ca_cert });
    if (config.auth_x509_cert) ops.push({ op: "set_ra_connection_auth_x509_cert", value: config.auth_x509_cert });
    if (config.auth_always_send_cert) ops.push({ op: "set_ra_connection_auth_always_send_cert" });
    if (config.local_users) {
      for (const user of config.local_users) {
        if (!user.username) continue;
        ops.push({ op: "create_ra_connection_auth_local_user", value: user.username });
        if (writableSecret(user.password)) ops.push({ op: "set_ra_connection_auth_local_user_password", value: `${user.username}|${writableSecret(user.password)}` });
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

    if (writableSecret(config.auth_psk)) ops.push({ op: "set_ra_connection_auth_psk", value: writableSecret(config.auth_psk) });

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
        if (writableSecret(u.password)) ops.push({ op: "set_ra_connection_auth_local_user_password", value: `${u.username}|${writableSecret(u.password)}` });
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
    if (writableSecret(config.secret)) ops.push({ op: "set_auth_psk_secret", value: writableSecret(config.secret) });
    if (config.secret_type) ops.push({ op: "set_auth_psk_secret_type", value: config.secret_type });
    if (config.dhcp_interface) ops.push({ op: "set_auth_psk_dhcp_interface", value: config.dhcp_interface });
    return this.batchConfigure(name, ops);
  }

  async updateAuthPSK(name: string, config: {
    identities?: string[];
    secret?: string;
    secret_type?: string;
    dhcp_interface?: string;
  }, existing: { identities?: string[]; secret_type?: string | null; dhcp_interface?: string | null }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_auth_psk" }];
    const nextIds = config.identities || [];
    const oldIds = existing.identities || [];
    for (const id of oldIds) {
      if (!nextIds.includes(id)) ops.push({ op: "delete_auth_psk_id", value: id });
    }
    for (const id of nextIds) {
      if (!oldIds.includes(id)) ops.push({ op: "set_auth_psk_id", value: id });
    }
    const secret = writableSecret(config.secret);
    if (secret) ops.push({ op: "set_auth_psk_secret", value: secret });
    if (config.secret_type && config.secret_type !== (existing.secret_type || "")) {
      ops.push({ op: "set_auth_psk_secret_type", value: config.secret_type });
    } else if (!config.secret_type && existing.secret_type) {
      ops.push({ op: "delete_auth_psk_secret_type" });
    }
    if (config.dhcp_interface && config.dhcp_interface !== (existing.dhcp_interface || "")) {
      ops.push({ op: "set_auth_psk_dhcp_interface", value: config.dhcp_interface });
    } else if (!config.dhcp_interface && existing.dhcp_interface) {
      ops.push({ op: "delete_auth_psk_dhcp_interface" });
    }
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

  // ==========================================================================
  // Operational commands (live status + reset/bounce)
  // ==========================================================================

  /** Live site-to-site tunnel status (on-demand refresh). */
  async getStatus(): Promise<IPSecStatus> {
    return apiClient.get<IPSecStatus>("/vyos/vpn/ipsec/status");
  }

  /** Bounce a single site-to-site peer, or just one of its tunnels. */
  async resetPeer(peer: string, tunnel?: string): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/ipsec/reset/peer", {
      peer,
      ...(tunnel !== undefined ? { tunnel } : {}),
    });
    if (!result.success) throw new Error(result.error || "Failed to reset peer");
    return result;
  }

  /** Bounce every configured site-to-site peer at once. */
  async resetAllPeers(): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/ipsec/reset/all", {});
    if (!result.success) throw new Error(result.error || "Failed to reset peers");
    return result;
  }

  /** Reset remote-access (IKEv2 road-warrior) sessions, optionally for one user. */
  async resetRemoteAccess(username?: string): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/ipsec/reset/remote-access", {
      ...(username !== undefined ? { username } : {}),
    });
    if (!result.success) throw new Error(result.error || "Failed to reset remote-access sessions");
    return result;
  }
}

export const ipsecService = new IPSecService();
