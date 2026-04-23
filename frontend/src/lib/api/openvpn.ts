import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface OpenvpnAuthentication {
  username: string | null;
  password: string | null;
}

export interface OpenvpnLocalAddress {
  address: string;
  subnet_mask: string | null;
}

export interface OpenvpnReplaceDefaultRoute {
  enabled: boolean;
  local: boolean;
}

export interface OpenvpnKeepAlive {
  failure_count: string | null;
  interval: string | null;
}

export interface OpenvpnEncryption {
  cipher: string | null;
  data_ciphers: string[];
  data_ciphers_fallback: string | null;
}

export interface OpenvpnTls {
  auth_key: string | null;
  ca_certificate: string | null;
  certificate: string | null;
  crypt_key: string | null;
  dh_params: string | null;
  peer_fingerprints: string[];
  role: string | null;
  tls_version_min: string | null;
}

export interface OpenvpnServerBridge {
  gateway: string | null;
  start: string | null;
  stop: string | null;
  subnet_mask: string | null;
  disable: boolean;
}

export interface OpenvpnClientIpPool {
  start: string | null;
  stop: string | null;
  subnet_mask: string | null;
  disable: boolean;
}

export interface OpenvpnClientIpv6Pool {
  base: string | null;
  disable: boolean;
}

export interface OpenvpnServerClient {
  name: string;
  disable: boolean;
  ip: string | null;
  push_route: string[];
  subnet: string[];
}

export interface OpenvpnServerPushRoute {
  route: string;
  metric: string | null;
}

export interface OpenvpnServerMfaTotp {
  challenge: string | null;
  digits: string | null;
  drift: string | null;
  slop: string | null;
  step: string | null;
}

export interface OpenvpnServer {
  subnet: string[];
  topology: string | null;
  domain_name: string | null;
  max_connections: string | null;
  name_server: string[];
  reject_unconfigured_clients: boolean;
  push_route: OpenvpnServerPushRoute[];
  bridge: OpenvpnServerBridge | null;
  client_ip_pool: OpenvpnClientIpPool | null;
  client_ipv6_pool: OpenvpnClientIpv6Pool | null;
  clients: OpenvpnServerClient[];
  mfa_totp: OpenvpnServerMfaTotp | null;
}

export interface OpenvpnIpConfig {
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

export interface OpenvpnIpv6Config {
  accept_dad: string | null;
  address_autoconf: boolean;
  address_eui64: string | null;
  address_no_default_link_local: boolean;
  address_interface_identifier: string | null;
  adjust_mss: string | null;
  base_reachable_time: string | null;
  disable_forwarding: boolean;
  dup_addr_detect_transmits: string | null;
  source_validation: string | null;
}

export interface OpenvpnInterface {
  name: string;
  type: string;
  description: string | null;
  disabled: boolean;
  device_type: string | null;
  mode: string | null;
  protocol: string | null;
  vrf: string | null;
  persistent_tunnel: boolean;
  use_lzo_compression: boolean;
  redirect: string | null;
  replace_default_route: OpenvpnReplaceDefaultRoute | null;
  offload_dco: boolean;
  openvpn_options: string[];
  authentication: OpenvpnAuthentication | null;
  local_addresses: OpenvpnLocalAddress[];
  local_host: string | null;
  local_port: string | null;
  remote_address: string[];
  remote_host: string[];
  remote_port: string | null;
  keep_alive: OpenvpnKeepAlive | null;
  shared_secret_key: string | null;
  encryption: OpenvpnEncryption | null;
  hash: string | null;
  tls: OpenvpnTls | null;
  server: OpenvpnServer | null;
  ip: OpenvpnIpConfig | null;
  ipv6: OpenvpnIpv6Config | null;
  mirror_ingress: string | null;
  mirror_egress: string | null;
}

export interface OpenvpnConfigResponse {
  interfaces: OpenvpnInterface[];
  total: number;
}

export interface OpenvpnCapabilityFeature {
  supported: boolean;
  description: string;
  syntax?: string;
}

export interface OpenvpnCapabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  features: Record<string, OpenvpnCapabilityFeature>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface OpenvpnBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// Config shape passed to createInterface (structured from wizard / advanced)
// ============================================================================

export interface OpenvpnCreateConfig {
  name: string;
  description?: string;
  disabled?: boolean;
  device_type?: string;
  mode?: string;
  protocol?: string;
  vrf?: string;
  persistent_tunnel?: boolean;
  use_lzo_compression?: boolean;
  redirect?: string;
  replace_default_route?: { enabled?: boolean; local?: boolean };
  offload_dco?: boolean;
  openvpn_options?: string[];
  authentication?: { username?: string; password?: string };
  local_addresses?: { address: string; subnet_mask?: string }[];
  local_host?: string;
  local_port?: string;
  remote_address?: string[];
  remote_host?: string[];
  remote_port?: string;
  keep_alive?: { failure_count?: string; interval?: string };
  shared_secret_key?: string;
  encryption?: {
    cipher?: string;
    data_ciphers?: string[];
    data_ciphers_fallback?: string;
  };
  hash?: string;
  tls?: {
    auth_key?: string;
    ca_certificate?: string;
    certificate?: string;
    crypt_key?: string;
    dh_params?: string;
    peer_fingerprints?: string[];
    role?: string;
    tls_version_min?: string;
  };
  server?: {
    subnet?: string[];
    topology?: string;
    domain_name?: string;
    max_connections?: string;
    name_server?: string[];
    reject_unconfigured_clients?: boolean;
    push_route?: { route: string; metric?: string }[];
    bridge?: {
      gateway?: string;
      start?: string;
      stop?: string;
      subnet_mask?: string;
      disable?: boolean;
    };
    client_ip_pool?: {
      start?: string;
      stop?: string;
      subnet_mask?: string;
      disable?: boolean;
    };
    client_ipv6_pool?: { base?: string; disable?: boolean };
    clients?: {
      name: string;
      disable?: boolean;
      ip?: string;
      push_route?: string[];
      subnet?: string[];
    }[];
    mfa_totp?: {
      challenge?: string;
      digits?: string;
      drift?: string;
      slop?: string;
      step?: string;
    };
  };
  ip?: Partial<OpenvpnIpConfig>;
  ipv6?: Partial<OpenvpnIpv6Config>;
  mirror_ingress?: string;
  mirror_egress?: string;
}

// ============================================================================
// Operation builder helpers
// ============================================================================

function buildInterfaceOps(
  config: OpenvpnCreateConfig
): OpenvpnBatchOperation[] {
  const ops: OpenvpnBatchOperation[] = [];

  if (config.description) ops.push({ op: "set_interface_description", value: config.description });
  if (config.disabled) ops.push({ op: "set_interface_disable" });
  if (config.device_type) ops.push({ op: "set_device_type", value: config.device_type });
  if (config.mode) ops.push({ op: "set_mode", value: config.mode });
  if (config.protocol) ops.push({ op: "set_protocol", value: config.protocol });
  if (config.vrf) ops.push({ op: "set_vrf", value: config.vrf });
  if (config.persistent_tunnel) ops.push({ op: "set_persistent_tunnel" });
  if (config.use_lzo_compression) ops.push({ op: "set_use_lzo_compression" });
  if (config.redirect) ops.push({ op: "set_redirect", value: config.redirect });
  if (config.replace_default_route?.enabled) {
    ops.push({ op: "set_replace_default_route" });
    if (config.replace_default_route.local) ops.push({ op: "set_replace_default_route_local" });
  }
  if (config.offload_dco) ops.push({ op: "set_offload_dco" });

  if (config.openvpn_options) {
    for (const opt of config.openvpn_options) {
      ops.push({ op: "set_openvpn_option", value: opt });
    }
  }

  if (config.authentication) {
    if (config.authentication.username) ops.push({ op: "set_authentication_username", value: config.authentication.username });
    if (config.authentication.password) ops.push({ op: "set_authentication_password", value: config.authentication.password });
  }

  if (config.local_addresses) {
    for (const la of config.local_addresses) {
      ops.push({ op: "set_local_address", value: la.address });
      if (la.subnet_mask) ops.push({ op: "set_local_address_subnet_mask", value: `${la.address}:${la.subnet_mask}` });
    }
  }

  if (config.local_host) ops.push({ op: "set_local_host", value: config.local_host });
  if (config.local_port) ops.push({ op: "set_local_port", value: config.local_port });

  if (config.remote_address) {
    for (const ra of config.remote_address) {
      ops.push({ op: "set_remote_address", value: ra });
    }
  }
  if (config.remote_host) {
    for (const rh of config.remote_host) {
      ops.push({ op: "set_remote_host", value: rh });
    }
  }
  if (config.remote_port) ops.push({ op: "set_remote_port", value: config.remote_port });

  if (config.keep_alive) {
    if (config.keep_alive.failure_count) ops.push({ op: "set_keep_alive_failure_count", value: config.keep_alive.failure_count });
    if (config.keep_alive.interval) ops.push({ op: "set_keep_alive_interval", value: config.keep_alive.interval });
  }

  if (config.shared_secret_key) ops.push({ op: "set_shared_secret_key", value: config.shared_secret_key });

  if (config.encryption) {
    if (config.encryption.cipher) ops.push({ op: "set_encryption_cipher", value: config.encryption.cipher });
    if (config.encryption.data_ciphers) {
      for (const c of config.encryption.data_ciphers) {
        ops.push({ op: "set_encryption_data_cipher", value: c });
      }
    }
    if (config.encryption.data_ciphers_fallback) {
      ops.push({ op: "set_encryption_data_ciphers_fallback", value: config.encryption.data_ciphers_fallback });
    }
  }

  if (config.hash) ops.push({ op: "set_hash", value: config.hash });

  if (config.tls) {
    if (config.tls.auth_key) ops.push({ op: "set_tls_auth_key", value: config.tls.auth_key });
    if (config.tls.ca_certificate) ops.push({ op: "set_tls_ca_certificate", value: config.tls.ca_certificate });
    if (config.tls.certificate) ops.push({ op: "set_tls_certificate", value: config.tls.certificate });
    if (config.tls.crypt_key) ops.push({ op: "set_tls_crypt_key", value: config.tls.crypt_key });
    if (config.tls.dh_params) ops.push({ op: "set_tls_dh_params", value: config.tls.dh_params });
    if (config.tls.peer_fingerprints) {
      for (const fp of config.tls.peer_fingerprints) {
        ops.push({ op: "set_tls_peer_fingerprint", value: fp });
      }
    }
    if (config.tls.role) ops.push({ op: "set_tls_role", value: config.tls.role });
    if (config.tls.tls_version_min) ops.push({ op: "set_tls_version_min", value: config.tls.tls_version_min });
  }

  if (config.server) {
    const s = config.server;
    if (s.subnet) {
      for (const sn of s.subnet) ops.push({ op: "set_server_subnet", value: sn });
    }
    if (s.topology) ops.push({ op: "set_server_topology", value: s.topology });
    if (s.domain_name) ops.push({ op: "set_server_domain_name", value: s.domain_name });
    if (s.max_connections) ops.push({ op: "set_server_max_connections", value: s.max_connections });
    if (s.name_server) {
      for (const ns of s.name_server) ops.push({ op: "set_server_name_server", value: ns });
    }
    if (s.reject_unconfigured_clients) ops.push({ op: "set_server_reject_unconfigured_clients" });
    if (s.push_route) {
      for (const pr of s.push_route) {
        ops.push({ op: "set_server_push_route", value: pr.route });
        if (pr.metric) ops.push({ op: "set_server_push_route_metric", value: `${pr.route}:${pr.metric}` });
      }
    }
    if (s.bridge) {
      if (s.bridge.gateway) ops.push({ op: "set_server_bridge_gateway", value: s.bridge.gateway });
      if (s.bridge.start) ops.push({ op: "set_server_bridge_start", value: s.bridge.start });
      if (s.bridge.stop) ops.push({ op: "set_server_bridge_stop", value: s.bridge.stop });
      if (s.bridge.subnet_mask) ops.push({ op: "set_server_bridge_subnet_mask", value: s.bridge.subnet_mask });
      if (s.bridge.disable) ops.push({ op: "set_server_bridge_disable" });
    }
    if (s.client_ip_pool) {
      if (s.client_ip_pool.start) ops.push({ op: "set_server_client_ip_pool_start", value: s.client_ip_pool.start });
      if (s.client_ip_pool.stop) ops.push({ op: "set_server_client_ip_pool_stop", value: s.client_ip_pool.stop });
      if (s.client_ip_pool.subnet_mask) ops.push({ op: "set_server_client_ip_pool_subnet_mask", value: s.client_ip_pool.subnet_mask });
      if (s.client_ip_pool.disable) ops.push({ op: "set_server_client_ip_pool_disable" });
    }
    if (s.client_ipv6_pool) {
      if (s.client_ipv6_pool.base) ops.push({ op: "set_server_client_ipv6_pool_base", value: s.client_ipv6_pool.base });
      if (s.client_ipv6_pool.disable) ops.push({ op: "set_server_client_ipv6_pool_disable" });
    }
    if (s.clients) {
      for (const c of s.clients) {
        ops.push({ op: "set_server_client", value: c.name });
        if (c.disable) ops.push({ op: "set_server_client_disable", value: c.name });
        if (c.ip) ops.push({ op: "set_server_client_ip", value: `${c.name}:${c.ip}` });
        if (c.push_route) {
          for (const r of c.push_route) ops.push({ op: "set_server_client_push_route", value: `${c.name}:${r}` });
        }
        if (c.subnet) {
          for (const sn of c.subnet) ops.push({ op: "set_server_client_subnet", value: `${c.name}:${sn}` });
        }
      }
    }
    if (s.mfa_totp) {
      if (s.mfa_totp.challenge) ops.push({ op: "set_server_mfa_totp_challenge", value: s.mfa_totp.challenge });
      if (s.mfa_totp.digits) ops.push({ op: "set_server_mfa_totp_digits", value: s.mfa_totp.digits });
      if (s.mfa_totp.drift) ops.push({ op: "set_server_mfa_totp_drift", value: s.mfa_totp.drift });
      if (s.mfa_totp.slop) ops.push({ op: "set_server_mfa_totp_slop", value: s.mfa_totp.slop });
      if (s.mfa_totp.step) ops.push({ op: "set_server_mfa_totp_step", value: s.mfa_totp.step });
    }
  }

  if (config.ip) {
    if (config.ip.adjust_mss) ops.push({ op: "set_ip_adjust_mss", value: config.ip.adjust_mss });
    if (config.ip.arp_cache_timeout) ops.push({ op: "set_ip_arp_cache_timeout", value: config.ip.arp_cache_timeout });
    if (config.ip.disable_arp_filter) ops.push({ op: "set_ip_disable_arp_filter" });
    if (config.ip.disable_forwarding) ops.push({ op: "set_ip_disable_forwarding" });
    if (config.ip.enable_arp_accept) ops.push({ op: "set_ip_enable_arp_accept" });
    if (config.ip.enable_arp_announce) ops.push({ op: "set_ip_enable_arp_announce" });
    if (config.ip.enable_arp_ignore) ops.push({ op: "set_ip_enable_arp_ignore" });
    if (config.ip.enable_directed_broadcast) ops.push({ op: "set_ip_enable_directed_broadcast" });
    if (config.ip.enable_proxy_arp) ops.push({ op: "set_ip_enable_proxy_arp" });
    if (config.ip.proxy_arp_pvlan) ops.push({ op: "set_ip_proxy_arp_pvlan" });
    if (config.ip.source_validation) ops.push({ op: "set_ip_source_validation", value: config.ip.source_validation });
  }

  if (config.ipv6) {
    if (config.ipv6.accept_dad) ops.push({ op: "set_ipv6_accept_dad", value: config.ipv6.accept_dad });
    if (config.ipv6.address_autoconf) ops.push({ op: "set_ipv6_address_autoconf" });
    if (config.ipv6.address_eui64) ops.push({ op: "set_ipv6_address_eui64", value: config.ipv6.address_eui64 });
    if (config.ipv6.address_no_default_link_local) ops.push({ op: "set_ipv6_address_no_default_link_local" });
    if (config.ipv6.address_interface_identifier) ops.push({ op: "set_ipv6_address_interface_identifier", value: config.ipv6.address_interface_identifier });
    if (config.ipv6.adjust_mss) ops.push({ op: "set_ipv6_adjust_mss", value: config.ipv6.adjust_mss });
    if (config.ipv6.base_reachable_time) ops.push({ op: "set_ipv6_base_reachable_time", value: config.ipv6.base_reachable_time });
    if (config.ipv6.disable_forwarding) ops.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6.dup_addr_detect_transmits) ops.push({ op: "set_ipv6_dup_addr_detect_transmits", value: config.ipv6.dup_addr_detect_transmits });
    if (config.ipv6.source_validation) ops.push({ op: "set_ipv6_source_validation", value: config.ipv6.source_validation });
  }

  if (config.mirror_ingress) ops.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
  if (config.mirror_egress) ops.push({ op: "set_mirror_egress", value: config.mirror_egress });

  return ops;
}

// ============================================================================
// API Service
// ============================================================================

class OpenvpnService {
  async getCapabilities(): Promise<OpenvpnCapabilities> {
    return apiClient.get<OpenvpnCapabilities>("/vyos/openvpn/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<OpenvpnConfigResponse> {
    return apiClient.get<OpenvpnConfigResponse>("/vyos/openvpn/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: OpenvpnBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/openvpn/batch", {
      interface: interfaceName,
      operations,
    });
    if (result.success) {
      await this.refreshConfig();
    }
    return result;
  }

  async createInterface(config: OpenvpnCreateConfig): Promise<VyOSResponse> {
    const ops = buildInterfaceOps(config);
    return this.batchConfigure(config.name, ops);
  }

  async updateInterface(
    name: string,
    current: OpenvpnInterface,
    updated: Partial<OpenvpnCreateConfig>
  ): Promise<VyOSResponse> {
    const ops: OpenvpnBatchOperation[] = [];

    // Basic fields
    if (updated.description !== undefined) {
      if (updated.description) ops.push({ op: "set_interface_description", value: updated.description });
      else ops.push({ op: "delete_interface_description" });
    }
    if (updated.disabled !== undefined) {
      if (updated.disabled) ops.push({ op: "set_interface_disable" });
      else ops.push({ op: "delete_interface_disable" });
    }
    if (updated.device_type !== undefined) {
      if (updated.device_type) ops.push({ op: "set_device_type", value: updated.device_type });
      else ops.push({ op: "delete_device_type" });
    }
    if (updated.mode !== undefined) {
      if (updated.mode) ops.push({ op: "set_mode", value: updated.mode });
      else ops.push({ op: "delete_mode" });
    }
    if (updated.protocol !== undefined) {
      if (updated.protocol) ops.push({ op: "set_protocol", value: updated.protocol });
      else ops.push({ op: "delete_protocol" });
    }
    if (updated.vrf !== undefined) {
      if (updated.vrf) ops.push({ op: "set_vrf", value: updated.vrf });
      else ops.push({ op: "delete_vrf" });
    }
    if (updated.persistent_tunnel !== undefined) {
      if (updated.persistent_tunnel) ops.push({ op: "set_persistent_tunnel" });
      else ops.push({ op: "delete_persistent_tunnel" });
    }
    if (updated.use_lzo_compression !== undefined) {
      if (updated.use_lzo_compression) ops.push({ op: "set_use_lzo_compression" });
      else ops.push({ op: "delete_use_lzo_compression" });
    }
    if (updated.redirect !== undefined) {
      if (updated.redirect) ops.push({ op: "set_redirect", value: updated.redirect });
      else ops.push({ op: "delete_redirect" });
    }
    if (updated.replace_default_route !== undefined) {
      if (updated.replace_default_route?.enabled) {
        ops.push({ op: "set_replace_default_route" });
        if (updated.replace_default_route.local) ops.push({ op: "set_replace_default_route_local" });
        else ops.push({ op: "delete_replace_default_route_local" });
      } else {
        ops.push({ op: "delete_replace_default_route" });
      }
    }
    if (updated.offload_dco !== undefined) {
      if (updated.offload_dco) ops.push({ op: "set_offload_dco" });
      else ops.push({ op: "delete_offload_dco" });
    }

    // openvpn_options (delete old, set new)
    if (updated.openvpn_options !== undefined) {
      for (const old of current.openvpn_options) {
        ops.push({ op: "delete_openvpn_option", value: old });
      }
      for (const opt of updated.openvpn_options) {
        ops.push({ op: "set_openvpn_option", value: opt });
      }
    }

    // Authentication
    if (updated.authentication !== undefined) {
      if (updated.authentication.username) ops.push({ op: "set_authentication_username", value: updated.authentication.username });
      else if (current.authentication?.username) ops.push({ op: "delete_authentication_username" });
      if (updated.authentication.password) ops.push({ op: "set_authentication_password", value: updated.authentication.password });
      else if (current.authentication?.password) ops.push({ op: "delete_authentication_password" });
    }

    // local_addresses (delete old, set new)
    if (updated.local_addresses !== undefined) {
      for (const old of current.local_addresses) {
        ops.push({ op: "delete_local_address", value: old.address });
      }
      for (const la of updated.local_addresses) {
        ops.push({ op: "set_local_address", value: la.address });
        if (la.subnet_mask) ops.push({ op: "set_local_address_subnet_mask", value: `${la.address}:${la.subnet_mask}` });
      }
    }

    if (updated.local_host !== undefined) {
      if (updated.local_host) ops.push({ op: "set_local_host", value: updated.local_host });
      else ops.push({ op: "delete_local_host" });
    }
    if (updated.local_port !== undefined) {
      if (updated.local_port) ops.push({ op: "set_local_port", value: updated.local_port });
      else ops.push({ op: "delete_local_port" });
    }

    // remote_address (delete old, set new)
    if (updated.remote_address !== undefined) {
      for (const old of current.remote_address) {
        ops.push({ op: "delete_remote_address", value: old });
      }
      for (const ra of updated.remote_address) {
        ops.push({ op: "set_remote_address", value: ra });
      }
    }
    // remote_host (delete old, set new)
    if (updated.remote_host !== undefined) {
      for (const old of current.remote_host) {
        ops.push({ op: "delete_remote_host", value: old });
      }
      for (const rh of updated.remote_host) {
        ops.push({ op: "set_remote_host", value: rh });
      }
    }
    if (updated.remote_port !== undefined) {
      if (updated.remote_port) ops.push({ op: "set_remote_port", value: updated.remote_port });
      else ops.push({ op: "delete_remote_port" });
    }

    if (updated.keep_alive !== undefined) {
      if (updated.keep_alive.failure_count) ops.push({ op: "set_keep_alive_failure_count", value: updated.keep_alive.failure_count });
      else if (current.keep_alive?.failure_count) ops.push({ op: "delete_keep_alive_failure_count" });
      if (updated.keep_alive.interval) ops.push({ op: "set_keep_alive_interval", value: updated.keep_alive.interval });
      else if (current.keep_alive?.interval) ops.push({ op: "delete_keep_alive_interval" });
    }

    if (updated.shared_secret_key !== undefined) {
      if (updated.shared_secret_key) ops.push({ op: "set_shared_secret_key", value: updated.shared_secret_key });
      else ops.push({ op: "delete_shared_secret_key" });
    }

    if (updated.encryption !== undefined) {
      if (updated.encryption.cipher !== undefined) {
        if (updated.encryption.cipher) ops.push({ op: "set_encryption_cipher", value: updated.encryption.cipher });
        else ops.push({ op: "delete_encryption_cipher" });
      }
      if (updated.encryption.data_ciphers !== undefined) {
        const currentCiphers = current.encryption?.data_ciphers ?? [];
        for (const old of currentCiphers) {
          ops.push({ op: "delete_encryption_data_cipher", value: old });
        }
        for (const c of updated.encryption.data_ciphers) {
          ops.push({ op: "set_encryption_data_cipher", value: c });
        }
      }
      if (updated.encryption.data_ciphers_fallback !== undefined) {
        if (updated.encryption.data_ciphers_fallback) ops.push({ op: "set_encryption_data_ciphers_fallback", value: updated.encryption.data_ciphers_fallback });
        else ops.push({ op: "delete_encryption_data_ciphers_fallback" });
      }
    }

    if (updated.hash !== undefined) {
      if (updated.hash) ops.push({ op: "set_hash", value: updated.hash });
      else ops.push({ op: "delete_hash" });
    }

    if (updated.tls !== undefined) {
      if (updated.tls.auth_key !== undefined) {
        if (updated.tls.auth_key) ops.push({ op: "set_tls_auth_key", value: updated.tls.auth_key });
        else ops.push({ op: "delete_tls_auth_key" });
      }
      if (updated.tls.ca_certificate !== undefined) {
        if (updated.tls.ca_certificate) ops.push({ op: "set_tls_ca_certificate", value: updated.tls.ca_certificate });
        else ops.push({ op: "delete_tls_ca_certificate" });
      }
      if (updated.tls.certificate !== undefined) {
        if (updated.tls.certificate) ops.push({ op: "set_tls_certificate", value: updated.tls.certificate });
        else ops.push({ op: "delete_tls_certificate" });
      }
      if (updated.tls.crypt_key !== undefined) {
        if (updated.tls.crypt_key) ops.push({ op: "set_tls_crypt_key", value: updated.tls.crypt_key });
        else ops.push({ op: "delete_tls_crypt_key" });
      }
      if (updated.tls.dh_params !== undefined) {
        if (updated.tls.dh_params) ops.push({ op: "set_tls_dh_params", value: updated.tls.dh_params });
        else ops.push({ op: "delete_tls_dh_params" });
      }
      if (updated.tls.peer_fingerprints !== undefined) {
        const currentFps = current.tls?.peer_fingerprints ?? [];
        for (const old of currentFps) {
          ops.push({ op: "delete_tls_peer_fingerprint", value: old });
        }
        for (const fp of updated.tls.peer_fingerprints) {
          ops.push({ op: "set_tls_peer_fingerprint", value: fp });
        }
      }
      if (updated.tls.role !== undefined) {
        if (updated.tls.role) ops.push({ op: "set_tls_role", value: updated.tls.role });
        else ops.push({ op: "delete_tls_role" });
      }
      if (updated.tls.tls_version_min !== undefined) {
        if (updated.tls.tls_version_min) ops.push({ op: "set_tls_version_min", value: updated.tls.tls_version_min });
        else ops.push({ op: "delete_tls_version_min" });
      }
    }

    if (updated.server !== undefined) {
      const s = updated.server;
      const cs = current.server;

      if (s.subnet !== undefined) {
        for (const old of cs?.subnet ?? []) {
          ops.push({ op: "delete_server_subnet", value: old });
        }
        for (const sn of s.subnet) ops.push({ op: "set_server_subnet", value: sn });
      }
      if (s.topology !== undefined) {
        if (s.topology) ops.push({ op: "set_server_topology", value: s.topology });
        else ops.push({ op: "delete_server_topology" });
      }
      if (s.domain_name !== undefined) {
        if (s.domain_name) ops.push({ op: "set_server_domain_name", value: s.domain_name });
        else ops.push({ op: "delete_server_domain_name" });
      }
      if (s.max_connections !== undefined) {
        if (s.max_connections) ops.push({ op: "set_server_max_connections", value: s.max_connections });
        else ops.push({ op: "delete_server_max_connections" });
      }
      if (s.name_server !== undefined) {
        for (const old of cs?.name_server ?? []) {
          ops.push({ op: "delete_server_name_server", value: old });
        }
        for (const ns of s.name_server) ops.push({ op: "set_server_name_server", value: ns });
      }
      if (s.reject_unconfigured_clients !== undefined) {
        if (s.reject_unconfigured_clients) ops.push({ op: "set_server_reject_unconfigured_clients" });
        else ops.push({ op: "delete_server_reject_unconfigured_clients" });
      }
      if (s.push_route !== undefined) {
        for (const old of cs?.push_route ?? []) {
          ops.push({ op: "delete_server_push_route", value: old.route });
        }
        for (const pr of s.push_route) {
          ops.push({ op: "set_server_push_route", value: pr.route });
          if (pr.metric) ops.push({ op: "set_server_push_route_metric", value: `${pr.route}:${pr.metric}` });
        }
      }
      if (s.bridge !== undefined) {
        if (s.bridge.gateway !== undefined) {
          if (s.bridge.gateway) ops.push({ op: "set_server_bridge_gateway", value: s.bridge.gateway });
          else ops.push({ op: "delete_server_bridge_gateway" });
        }
        if (s.bridge.start !== undefined) {
          if (s.bridge.start) ops.push({ op: "set_server_bridge_start", value: s.bridge.start });
          else ops.push({ op: "delete_server_bridge_start" });
        }
        if (s.bridge.stop !== undefined) {
          if (s.bridge.stop) ops.push({ op: "set_server_bridge_stop", value: s.bridge.stop });
          else ops.push({ op: "delete_server_bridge_stop" });
        }
        if (s.bridge.subnet_mask !== undefined) {
          if (s.bridge.subnet_mask) ops.push({ op: "set_server_bridge_subnet_mask", value: s.bridge.subnet_mask });
          else ops.push({ op: "delete_server_bridge_subnet_mask" });
        }
        if (s.bridge.disable !== undefined) {
          if (s.bridge.disable) ops.push({ op: "set_server_bridge_disable" });
          else ops.push({ op: "delete_server_bridge_disable" });
        }
      }
      if (s.client_ip_pool !== undefined) {
        if (s.client_ip_pool.start !== undefined) {
          if (s.client_ip_pool.start) ops.push({ op: "set_server_client_ip_pool_start", value: s.client_ip_pool.start });
          else ops.push({ op: "delete_server_client_ip_pool_start" });
        }
        if (s.client_ip_pool.stop !== undefined) {
          if (s.client_ip_pool.stop) ops.push({ op: "set_server_client_ip_pool_stop", value: s.client_ip_pool.stop });
          else ops.push({ op: "delete_server_client_ip_pool_stop" });
        }
        if (s.client_ip_pool.subnet_mask !== undefined) {
          if (s.client_ip_pool.subnet_mask) ops.push({ op: "set_server_client_ip_pool_subnet_mask", value: s.client_ip_pool.subnet_mask });
          else ops.push({ op: "delete_server_client_ip_pool_subnet_mask" });
        }
        if (s.client_ip_pool.disable !== undefined) {
          if (s.client_ip_pool.disable) ops.push({ op: "set_server_client_ip_pool_disable" });
          else ops.push({ op: "delete_server_client_ip_pool_disable" });
        }
      }
      if (s.client_ipv6_pool !== undefined) {
        if (s.client_ipv6_pool.base !== undefined) {
          if (s.client_ipv6_pool.base) ops.push({ op: "set_server_client_ipv6_pool_base", value: s.client_ipv6_pool.base });
          else ops.push({ op: "delete_server_client_ipv6_pool_base" });
        }
        if (s.client_ipv6_pool.disable !== undefined) {
          if (s.client_ipv6_pool.disable) ops.push({ op: "set_server_client_ipv6_pool_disable" });
          else ops.push({ op: "delete_server_client_ipv6_pool_disable" });
        }
      }
      if (s.clients !== undefined) {
        for (const oldClient of cs?.clients ?? []) {
          ops.push({ op: "delete_server_client", value: oldClient.name });
        }
        for (const c of s.clients) {
          ops.push({ op: "set_server_client", value: c.name });
          if (c.disable) ops.push({ op: "set_server_client_disable", value: c.name });
          if (c.ip) ops.push({ op: "set_server_client_ip", value: `${c.name}:${c.ip}` });
          if (c.push_route) {
            for (const r of c.push_route) ops.push({ op: "set_server_client_push_route", value: `${c.name}:${r}` });
          }
          if (c.subnet) {
            for (const sn of c.subnet) ops.push({ op: "set_server_client_subnet", value: `${c.name}:${sn}` });
          }
        }
      }
      if (s.mfa_totp !== undefined) {
        if (s.mfa_totp.challenge !== undefined) {
          if (s.mfa_totp.challenge) ops.push({ op: "set_server_mfa_totp_challenge", value: s.mfa_totp.challenge });
          else ops.push({ op: "delete_server_mfa_totp_challenge" });
        }
        if (s.mfa_totp.digits !== undefined) {
          if (s.mfa_totp.digits) ops.push({ op: "set_server_mfa_totp_digits", value: s.mfa_totp.digits });
          else ops.push({ op: "delete_server_mfa_totp_digits" });
        }
        if (s.mfa_totp.drift !== undefined) {
          if (s.mfa_totp.drift) ops.push({ op: "set_server_mfa_totp_drift", value: s.mfa_totp.drift });
          else ops.push({ op: "delete_server_mfa_totp_drift" });
        }
        if (s.mfa_totp.slop !== undefined) {
          if (s.mfa_totp.slop) ops.push({ op: "set_server_mfa_totp_slop", value: s.mfa_totp.slop });
          else ops.push({ op: "delete_server_mfa_totp_slop" });
        }
        if (s.mfa_totp.step !== undefined) {
          if (s.mfa_totp.step) ops.push({ op: "set_server_mfa_totp_step", value: s.mfa_totp.step });
          else ops.push({ op: "delete_server_mfa_totp_step" });
        }
      }
    }

    if (updated.ip !== undefined) {
      const ip = updated.ip;
      if (ip.adjust_mss !== undefined) {
        if (ip.adjust_mss) ops.push({ op: "set_ip_adjust_mss", value: ip.adjust_mss });
        else ops.push({ op: "delete_ip_adjust_mss" });
      }
      if (ip.arp_cache_timeout !== undefined) {
        if (ip.arp_cache_timeout) ops.push({ op: "set_ip_arp_cache_timeout", value: ip.arp_cache_timeout });
        else ops.push({ op: "delete_ip_arp_cache_timeout" });
      }
      if (ip.disable_arp_filter !== undefined) ops.push({ op: ip.disable_arp_filter ? "set_ip_disable_arp_filter" : "delete_ip_disable_arp_filter" });
      if (ip.disable_forwarding !== undefined) ops.push({ op: ip.disable_forwarding ? "set_ip_disable_forwarding" : "delete_ip_disable_forwarding" });
      if (ip.enable_arp_accept !== undefined) ops.push({ op: ip.enable_arp_accept ? "set_ip_enable_arp_accept" : "delete_ip_enable_arp_accept" });
      if (ip.enable_arp_announce !== undefined) ops.push({ op: ip.enable_arp_announce ? "set_ip_enable_arp_announce" : "delete_ip_enable_arp_announce" });
      if (ip.enable_arp_ignore !== undefined) ops.push({ op: ip.enable_arp_ignore ? "set_ip_enable_arp_ignore" : "delete_ip_enable_arp_ignore" });
      if (ip.enable_directed_broadcast !== undefined) ops.push({ op: ip.enable_directed_broadcast ? "set_ip_enable_directed_broadcast" : "delete_ip_enable_directed_broadcast" });
      if (ip.enable_proxy_arp !== undefined) ops.push({ op: ip.enable_proxy_arp ? "set_ip_enable_proxy_arp" : "delete_ip_enable_proxy_arp" });
      if (ip.proxy_arp_pvlan !== undefined) ops.push({ op: ip.proxy_arp_pvlan ? "set_ip_proxy_arp_pvlan" : "delete_ip_proxy_arp_pvlan" });
      if (ip.source_validation !== undefined) {
        if (ip.source_validation) ops.push({ op: "set_ip_source_validation", value: ip.source_validation });
        else ops.push({ op: "delete_ip_source_validation" });
      }
    }

    if (updated.ipv6 !== undefined) {
      const ipv6 = updated.ipv6;
      if (ipv6.accept_dad !== undefined) {
        if (ipv6.accept_dad) ops.push({ op: "set_ipv6_accept_dad", value: ipv6.accept_dad });
        else ops.push({ op: "delete_ipv6_accept_dad" });
      }
      if (ipv6.address_autoconf !== undefined) ops.push({ op: ipv6.address_autoconf ? "set_ipv6_address_autoconf" : "delete_ipv6_address_autoconf" });
      if (ipv6.address_eui64 !== undefined) {
        if (ipv6.address_eui64) ops.push({ op: "set_ipv6_address_eui64", value: ipv6.address_eui64 });
        else ops.push({ op: "delete_ipv6_address_eui64" });
      }
      if (ipv6.address_no_default_link_local !== undefined) ops.push({ op: ipv6.address_no_default_link_local ? "set_ipv6_address_no_default_link_local" : "delete_ipv6_address_no_default_link_local" });
      if (ipv6.address_interface_identifier !== undefined) {
        if (ipv6.address_interface_identifier) ops.push({ op: "set_ipv6_address_interface_identifier", value: ipv6.address_interface_identifier });
        else ops.push({ op: "delete_ipv6_address_interface_identifier" });
      }
      if (ipv6.adjust_mss !== undefined) {
        if (ipv6.adjust_mss) ops.push({ op: "set_ipv6_adjust_mss", value: ipv6.adjust_mss });
        else ops.push({ op: "delete_ipv6_adjust_mss" });
      }
      if (ipv6.base_reachable_time !== undefined) {
        if (ipv6.base_reachable_time) ops.push({ op: "set_ipv6_base_reachable_time", value: ipv6.base_reachable_time });
        else ops.push({ op: "delete_ipv6_base_reachable_time" });
      }
      if (ipv6.disable_forwarding !== undefined) ops.push({ op: ipv6.disable_forwarding ? "set_ipv6_disable_forwarding" : "delete_ipv6_disable_forwarding" });
      if (ipv6.dup_addr_detect_transmits !== undefined) {
        if (ipv6.dup_addr_detect_transmits) ops.push({ op: "set_ipv6_dup_addr_detect_transmits", value: ipv6.dup_addr_detect_transmits });
        else ops.push({ op: "delete_ipv6_dup_addr_detect_transmits" });
      }
      if (ipv6.source_validation !== undefined) {
        if (ipv6.source_validation) ops.push({ op: "set_ipv6_source_validation", value: ipv6.source_validation });
        else ops.push({ op: "delete_ipv6_source_validation" });
      }
    }

    if (updated.mirror_ingress !== undefined) {
      if (updated.mirror_ingress) ops.push({ op: "set_mirror_ingress", value: updated.mirror_ingress });
      else ops.push({ op: "delete_mirror_ingress" });
    }
    if (updated.mirror_egress !== undefined) {
      if (updated.mirror_egress) ops.push({ op: "set_mirror_egress", value: updated.mirror_egress });
      else ops.push({ op: "delete_mirror_egress" });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes detected" } };
    }

    return this.batchConfigure(name, ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const openvpnService = new OpenvpnService();
