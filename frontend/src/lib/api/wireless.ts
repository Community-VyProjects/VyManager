import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface WpaRadiusServer {
  server: string;
  key: string | null;
  port: string | null;
  accounting: boolean;
  disable: boolean;
}

export interface WpaSecurity {
  mode: string | null;
  passphrase: string | null;
  cipher: string[];
  group_cipher: string | null;
  group_mgmt_cipher: string | null;
  radius_servers: WpaRadiusServer[];
  radius_source_address: string | null;
}

export interface WepSecurity {
  key: string[];
}

export interface HeBeamform {
  multi_user_beamformer: boolean;
  single_user_beamformee: boolean;
  single_user_beamformer: boolean;
}

export interface StationAddressSecurity {
  mode: string | null;
  accept_mac: string[];
  deny_mac: string[];
}

export interface WirelessSecurity {
  wpa: WpaSecurity | null;
  wep: WepSecurity | null;
  station_address: StationAddressSecurity | null;
}

export interface HtCapabilities {
  channel_set_width: string[];
  mhz_incapable_40: boolean;
  auto_powersave: boolean;
  delayed_block_ack: boolean;
  dsss_cck_40: boolean;
  greenfield: boolean;
  ldpc: boolean;
  lsig_protection: boolean;
  max_amsdu: string | null;
  short_gi: string[];
  smps: string | null;
  stbc_rx: string | null;
  stbc_tx: boolean;
}

export interface VhtCapabilities {
  antenna_count: string | null;
  antenna_pattern_fixed: boolean;
  beamform: string[];
  center_channel_freq_1: string | null;
  center_channel_freq_2: string | null;
  channel_set_width: string | null;
  ldpc: boolean;
  link_adaptation: string | null;
  max_mpdu_exp: string | null;
  max_mpdu: string | null;
  short_gi: string[];
  stbc_rx: string | null;
  stbc_tx: boolean;
  tx_powersave: boolean;
  vht_cf: boolean;
}

export interface HeCapabilities {
  antenna_pattern_fixed: boolean;
  beamform: HeBeamform | null;
  bss_color: string | null;
  center_channel_freq_1: string | null;
  center_channel_freq_2: string | null;
  channel_set_width: string | null;
  coding_scheme: string | null;
}

export interface WirelessCapabilities {
  ht: HtCapabilities | null;
  vht: VhtCapabilities | null;
  he: HeCapabilities | null;
  require_ht: boolean;
  require_vht: boolean;
  require_he: boolean;
}

export interface WirelessInterface {
  name: string;
  wireless_type: string | null;
  mode: string | null;
  ssid: string | null;
  channel: string | null;
  description: string | null;
  disable: boolean;
  mac: string | null;
  hw_id: string | null;
  physical_device: string | null;
  vrf: string | null;
  mtu: string | null;
  addresses: string[];
  disable_broadcast_ssid: boolean;
  expunge_failing_stations: boolean;
  isolate_stations: boolean;
  max_stations: string | null;
  mgmt_frame_protection: string | null;
  per_client_thread: boolean;
  reduce_transmit_power: boolean;
  stationary_ap: boolean;
  enable_bf_protection: boolean;
  ip_disable_forwarding: boolean;
  ip_source_validation: string | null;
  ip_enable_proxy_arp: boolean;
  ip_arp_cache_timeout: string | null;
  ipv6_disable_forwarding: boolean;
  ipv6_address_eui64: string[];
  ipv6_address_no_default_link_local: boolean;
  mirror_ingress: string | null;
  mirror_egress: string | null;
  redirect: string | null;
  security: WirelessSecurity | null;
  capabilities: WirelessCapabilities | null;
  country_code: string | null;
  bssid: string | null;
}

export interface WirelessConfigResponse {
  interfaces: WirelessInterface[];
  total: number;
  by_type: Record<string, number>;
  by_wireless_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface WirelessCapabilitiesResponse {
  version: string;
  features: Record<string, { supported: boolean; description: string }>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface WirelessBatchOperation {
  op: string;
  value?: string;
}

// ============================================================================
// API Service
// ============================================================================

class WirelessService {
  async getCapabilities(): Promise<WirelessCapabilitiesResponse> {
    return apiClient.get<WirelessCapabilitiesResponse>("/vyos/wireless/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<WirelessConfigResponse> {
    return apiClient.get<WirelessConfigResponse>("/vyos/wireless/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async batchConfigure(
    interfaceName: string,
    operations: WirelessBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/wireless/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  async createInterface(config: {
    name: string;
    wireless_type?: string;
    mode?: string;
    ssid?: string;
    channel?: string;
    description?: string;
    disable?: boolean;
    mac?: string;
    hw_id?: string;
    physical_device?: string;
    vrf?: string;
    mtu?: string;
    addresses?: string[];
    // AP settings
    disable_broadcast_ssid?: boolean;
    expunge_failing_stations?: boolean;
    isolate_stations?: boolean;
    max_stations?: string;
    mgmt_frame_protection?: string;
    per_client_thread?: boolean;
    reduce_transmit_power?: boolean;
    stationary_ap?: boolean;
    enable_bf_protection?: boolean;
    // Security - WPA
    wpa_mode?: string;
    wpa_passphrase?: string;
    wpa_ciphers?: string[];
    wpa_group_cipher?: string;
    wpa_group_mgmt_cipher?: string;
    wpa_radius_servers?: WpaRadiusServer[];
    wpa_radius_source_address?: string;
    // Security - WEP
    wep_keys?: string[];
    // Security - Station address
    station_address_mode?: string;
    station_accept_macs?: string[];
    station_deny_macs?: string[];
    // HT capabilities
    ht_channel_set_width?: string[];
    ht_short_gi?: string[];
    ht_smps?: string;
    ht_max_amsdu?: string;
    ht_stbc_rx?: string;
    ht_mhz_incapable_40?: boolean;
    ht_auto_powersave?: boolean;
    ht_delayed_block_ack?: boolean;
    ht_dsss_cck_40?: boolean;
    ht_greenfield?: boolean;
    ht_ldpc?: boolean;
    ht_lsig_protection?: boolean;
    ht_stbc_tx?: boolean;
    require_ht?: boolean;
    // VHT capabilities
    vht_channel_set_width?: string;
    vht_short_gi?: string[];
    vht_beamform?: string[];
    vht_center_channel_freq_1?: string;
    vht_center_channel_freq_2?: string;
    vht_antenna_count?: string;
    vht_max_mpdu?: string;
    vht_max_mpdu_exp?: string;
    vht_link_adaptation?: string;
    vht_antenna_pattern_fixed?: boolean;
    vht_ldpc?: boolean;
    vht_stbc_tx?: boolean;
    vht_tx_powersave?: boolean;
    vht_cf?: boolean;
    vht_stbc_rx?: string;
    require_vht?: boolean;
    // HE capabilities
    he_channel_set_width?: string;
    he_coding_scheme?: string;
    he_bss_color?: string;
    he_center_channel_freq_1?: string;
    he_center_channel_freq_2?: string;
    he_beamform_multi_user?: boolean;
    he_beamform_su_beamformee?: boolean;
    he_beamform_su_beamformer?: boolean;
    he_antenna_pattern_fixed?: boolean;
    require_he?: boolean;
    // IP settings
    ip_source_validation?: string;
    ip_arp_cache_timeout?: string;
    ip_disable_forwarding?: boolean;
    ip_enable_proxy_arp?: boolean;
    // IPv6 settings
    ipv6_address_eui64?: string[];
    ipv6_disable_forwarding?: boolean;
    ipv6_address_no_default_link_local?: boolean;
    // Mirror / Redirect
    mirror_ingress?: string;
    mirror_egress?: string;
    redirect?: string;
    // Version-specific
    country_code?: string;
    bssid?: string;
  }): Promise<VyOSResponse> {
    const ops: WirelessBatchOperation[] = [];

    // Basic
    if (config.wireless_type) ops.push({ op: "set_interface_type", value: config.wireless_type });
    if (config.mode) ops.push({ op: "set_interface_mode", value: config.mode });
    if (config.ssid) ops.push({ op: "set_interface_ssid", value: config.ssid });
    if (config.channel) ops.push({ op: "set_interface_channel", value: config.channel });
    if (config.description) ops.push({ op: "set_interface_description", value: config.description });
    if (config.disable) ops.push({ op: "set_interface_disable" });
    if (config.mac) ops.push({ op: "set_interface_mac", value: config.mac });
    if (config.hw_id) ops.push({ op: "set_interface_hw_id", value: config.hw_id });
    if (config.physical_device) ops.push({ op: "set_interface_physical_device", value: config.physical_device });
    if (config.vrf) ops.push({ op: "set_interface_vrf", value: config.vrf });
    if (config.mtu) ops.push({ op: "set_interface_mtu", value: config.mtu });
    if (config.addresses) {
      for (const addr of config.addresses) ops.push({ op: "set_interface_address", value: addr });
    }

    // AP settings
    if (config.disable_broadcast_ssid) ops.push({ op: "set_disable_broadcast_ssid" });
    if (config.expunge_failing_stations) ops.push({ op: "set_expunge_failing_stations" });
    if (config.isolate_stations) ops.push({ op: "set_isolate_stations" });
    if (config.max_stations) ops.push({ op: "set_max_stations", value: config.max_stations });
    if (config.mgmt_frame_protection) ops.push({ op: "set_mgmt_frame_protection", value: config.mgmt_frame_protection });
    if (config.per_client_thread) ops.push({ op: "set_per_client_thread" });
    if (config.reduce_transmit_power) ops.push({ op: "set_reduce_transmit_power" });
    if (config.stationary_ap) ops.push({ op: "set_stationary_ap" });
    if (config.enable_bf_protection) ops.push({ op: "set_enable_bf_protection" });

    // WPA security
    if (config.wpa_mode) ops.push({ op: "set_security_wpa_mode", value: config.wpa_mode });
    if (config.wpa_passphrase) ops.push({ op: "set_security_wpa_passphrase", value: config.wpa_passphrase });
    if (config.wpa_ciphers) {
      for (const c of config.wpa_ciphers) ops.push({ op: "set_security_wpa_cipher", value: c });
    }
    if (config.wpa_group_cipher) ops.push({ op: "set_security_wpa_group_cipher", value: config.wpa_group_cipher });
    if (config.wpa_group_mgmt_cipher) ops.push({ op: "set_security_wpa_group_mgmt_cipher", value: config.wpa_group_mgmt_cipher });
    if (config.wpa_radius_source_address) ops.push({ op: "set_security_wpa_radius_source_address", value: config.wpa_radius_source_address });
    if (config.wpa_radius_servers) {
      for (const srv of config.wpa_radius_servers) {
        ops.push({ op: "set_security_wpa_radius_server", value: srv.server });
        if (srv.key) ops.push({ op: "set_security_wpa_radius_server_key", value: `${srv.server}:${srv.key}` });
        if (srv.port) ops.push({ op: "set_security_wpa_radius_server_port", value: `${srv.server}:${srv.port}` });
        if (srv.accounting) ops.push({ op: "set_security_wpa_radius_server_accounting", value: srv.server });
        if (srv.disable) ops.push({ op: "set_security_wpa_radius_server_disable", value: srv.server });
      }
    }

    // WEP security
    if (config.wep_keys) {
      for (const k of config.wep_keys) ops.push({ op: "set_security_wep_key", value: k });
    }

    // Station address filtering
    if (config.station_address_mode) ops.push({ op: "set_security_station_address_mode", value: config.station_address_mode });
    if (config.station_accept_macs) {
      for (const m of config.station_accept_macs) ops.push({ op: "set_security_station_accept_mac", value: m });
    }
    if (config.station_deny_macs) {
      for (const m of config.station_deny_macs) ops.push({ op: "set_security_station_deny_mac", value: m });
    }

    // HT capabilities
    if (config.ht_channel_set_width) {
      for (const w of config.ht_channel_set_width) ops.push({ op: "set_cap_ht_channel_set_width", value: w });
    }
    if (config.ht_short_gi) {
      for (const g of config.ht_short_gi) ops.push({ op: "set_cap_ht_short_gi", value: g });
    }
    if (config.ht_smps) ops.push({ op: "set_cap_ht_smps", value: config.ht_smps });
    if (config.ht_max_amsdu) ops.push({ op: "set_cap_ht_max_amsdu", value: config.ht_max_amsdu });
    if (config.ht_stbc_rx) ops.push({ op: "set_cap_ht_stbc_rx", value: config.ht_stbc_rx });
    if (config.ht_mhz_incapable_40) ops.push({ op: "set_cap_ht_40mhz_incapable" });
    if (config.ht_auto_powersave) ops.push({ op: "set_cap_ht_auto_powersave" });
    if (config.ht_delayed_block_ack) ops.push({ op: "set_cap_ht_delayed_block_ack" });
    if (config.ht_dsss_cck_40) ops.push({ op: "set_cap_ht_dsss_cck_40" });
    if (config.ht_greenfield) ops.push({ op: "set_cap_ht_greenfield" });
    if (config.ht_ldpc) ops.push({ op: "set_cap_ht_ldpc" });
    if (config.ht_lsig_protection) ops.push({ op: "set_cap_ht_lsig_protection" });
    if (config.ht_stbc_tx) ops.push({ op: "set_cap_ht_stbc_tx" });
    if (config.require_ht) ops.push({ op: "set_cap_require_ht" });

    // VHT capabilities
    if (config.vht_channel_set_width) ops.push({ op: "set_cap_vht_channel_set_width", value: config.vht_channel_set_width });
    if (config.vht_short_gi) {
      for (const g of config.vht_short_gi) ops.push({ op: "set_cap_vht_short_gi", value: g });
    }
    if (config.vht_beamform) {
      for (const b of config.vht_beamform) ops.push({ op: "set_cap_vht_beamform", value: b });
    }
    if (config.vht_center_channel_freq_1) ops.push({ op: "set_cap_vht_center_channel_freq_1", value: config.vht_center_channel_freq_1 });
    if (config.vht_center_channel_freq_2) ops.push({ op: "set_cap_vht_center_channel_freq_2", value: config.vht_center_channel_freq_2 });
    if (config.vht_antenna_count) ops.push({ op: "set_cap_vht_antenna_count", value: config.vht_antenna_count });
    if (config.vht_max_mpdu) ops.push({ op: "set_cap_vht_max_mpdu", value: config.vht_max_mpdu });
    if (config.vht_max_mpdu_exp) ops.push({ op: "set_cap_vht_max_mpdu_exp", value: config.vht_max_mpdu_exp });
    if (config.vht_link_adaptation) ops.push({ op: "set_cap_vht_link_adaptation", value: config.vht_link_adaptation });
    if (config.vht_antenna_pattern_fixed) ops.push({ op: "set_cap_vht_antenna_pattern_fixed" });
    if (config.vht_ldpc) ops.push({ op: "set_cap_vht_ldpc" });
    if (config.vht_stbc_tx) ops.push({ op: "set_cap_vht_stbc_tx" });
    if (config.vht_tx_powersave) ops.push({ op: "set_cap_vht_tx_powersave" });
    if (config.vht_cf) ops.push({ op: "set_cap_vht_vht_cf" });
    if (config.vht_stbc_rx) ops.push({ op: "set_cap_vht_stbc_rx", value: config.vht_stbc_rx });
    if (config.require_vht) ops.push({ op: "set_cap_require_vht" });

    // HE capabilities
    if (config.he_channel_set_width) ops.push({ op: "set_cap_he_channel_set_width", value: config.he_channel_set_width });
    if (config.he_coding_scheme) ops.push({ op: "set_cap_he_coding_scheme", value: config.he_coding_scheme });
    if (config.he_bss_color) ops.push({ op: "set_cap_he_bss_color", value: config.he_bss_color });
    if (config.he_center_channel_freq_1) ops.push({ op: "set_cap_he_center_channel_freq_1", value: config.he_center_channel_freq_1 });
    if (config.he_center_channel_freq_2) ops.push({ op: "set_cap_he_center_channel_freq_2", value: config.he_center_channel_freq_2 });
    if (config.he_beamform_multi_user) ops.push({ op: "set_cap_he_beamform", value: "multi-user-beamformer" });
    if (config.he_beamform_su_beamformee) ops.push({ op: "set_cap_he_beamform", value: "single-user-beamformee" });
    if (config.he_beamform_su_beamformer) ops.push({ op: "set_cap_he_beamform", value: "single-user-beamformer" });
    if (config.he_antenna_pattern_fixed) ops.push({ op: "set_cap_he_antenna_pattern_fixed" });
    if (config.require_he) ops.push({ op: "set_cap_require_he" });

    // IP settings
    if (config.ip_source_validation) ops.push({ op: "set_ip_source_validation", value: config.ip_source_validation });
    if (config.ip_arp_cache_timeout) ops.push({ op: "set_ip_arp_cache_timeout", value: config.ip_arp_cache_timeout });
    if (config.ip_disable_forwarding) ops.push({ op: "set_ip_disable_forwarding" });
    if (config.ip_enable_proxy_arp) ops.push({ op: "set_ip_enable_proxy_arp" });

    // IPv6 settings
    if (config.ipv6_address_eui64) {
      for (const p of config.ipv6_address_eui64) ops.push({ op: "set_ipv6_address_eui64", value: p });
    }
    if (config.ipv6_disable_forwarding) ops.push({ op: "set_ipv6_disable_forwarding" });
    if (config.ipv6_address_no_default_link_local) ops.push({ op: "set_ipv6_address_no_default_link_local" });

    // Mirror / Redirect
    if (config.mirror_ingress) ops.push({ op: "set_mirror_ingress", value: config.mirror_ingress });
    if (config.mirror_egress) ops.push({ op: "set_mirror_egress", value: config.mirror_egress });
    if (config.redirect) ops.push({ op: "set_redirect", value: config.redirect });

    // Version-specific
    if (config.country_code) ops.push({ op: "set_country_code", value: config.country_code });
    if (config.bssid) ops.push({ op: "set_bssid", value: config.bssid });

    return this.batchConfigure(config.name, ops);
  }

  async updateInterface(
    name: string,
    current: WirelessInterface,
    updated: Partial<{
      wireless_type: string | null;
      mode: string | null;
      ssid: string | null;
      channel: string | null;
      description: string | null;
      disable: boolean;
      mac: string | null;
      hw_id: string | null;
      physical_device: string | null;
      vrf: string | null;
      mtu: string | null;
      addresses: string[];
      disable_broadcast_ssid: boolean;
      expunge_failing_stations: boolean;
      isolate_stations: boolean;
      max_stations: string | null;
      mgmt_frame_protection: string | null;
      per_client_thread: boolean;
      reduce_transmit_power: boolean;
      stationary_ap: boolean;
      enable_bf_protection: boolean;
      wpa_mode: string | null;
      wpa_passphrase: string | null;
      wpa_ciphers: string[];
      wpa_group_cipher: string | null;
      wpa_group_mgmt_cipher: string | null;
      wpa_radius_servers: WpaRadiusServer[];
      wpa_radius_source_address: string | null;
      wep_keys: string[];
      station_address_mode: string | null;
      station_accept_macs: string[];
      station_deny_macs: string[];
      clear_security: boolean;
      ht_channel_set_width: string[];
      ht_short_gi: string[];
      ht_smps: string | null;
      ht_max_amsdu: string | null;
      ht_stbc_rx: string | null;
      ht_mhz_incapable_40: boolean;
      ht_auto_powersave: boolean;
      ht_delayed_block_ack: boolean;
      ht_dsss_cck_40: boolean;
      ht_greenfield: boolean;
      ht_ldpc: boolean;
      ht_lsig_protection: boolean;
      ht_stbc_tx: boolean;
      require_ht: boolean;
      vht_channel_set_width: string | null;
      vht_short_gi: string[];
      vht_beamform: string[];
      vht_center_channel_freq_1: string | null;
      vht_center_channel_freq_2: string | null;
      vht_antenna_count: string | null;
      vht_max_mpdu: string | null;
      vht_max_mpdu_exp: string | null;
      vht_link_adaptation: string | null;
      vht_antenna_pattern_fixed: boolean;
      vht_ldpc: boolean;
      vht_stbc_tx: boolean;
      vht_tx_powersave: boolean;
      vht_cf: boolean;
      vht_stbc_rx: string | null;
      require_vht: boolean;
      he_channel_set_width: string | null;
      he_coding_scheme: string | null;
      he_bss_color: string | null;
      he_center_channel_freq_1: string | null;
      he_center_channel_freq_2: string | null;
      he_beamform_multi_user: boolean;
      he_beamform_su_beamformee: boolean;
      he_beamform_su_beamformer: boolean;
      he_antenna_pattern_fixed: boolean;
      require_he: boolean;
      ip_source_validation: string | null;
      ip_arp_cache_timeout: string | null;
      ip_disable_forwarding: boolean;
      ip_enable_proxy_arp: boolean;
      ipv6_address_eui64: string[];
      ipv6_disable_forwarding: boolean;
      ipv6_address_no_default_link_local: boolean;
      mirror_ingress: string | null;
      mirror_egress: string | null;
      redirect: string | null;
      country_code: string | null;
      bssid: string | null;
    }>
  ): Promise<VyOSResponse> {
    const ops: WirelessBatchOperation[] = [];
    const cur = current;
    const curSec = cur.security;
    const curWpa = curSec?.wpa;
    const curCap = cur.capabilities;
    const curHt = curCap?.ht;
    const curVht = curCap?.vht;
    const curHe = curCap?.he;

    // String fields
    const strFields: Array<{ key: keyof typeof updated; setOp: string; deleteOp: string; curVal: string | null }> = [
      { key: "wireless_type", setOp: "set_interface_type", deleteOp: "delete_interface_type", curVal: cur.wireless_type },
      { key: "mode", setOp: "set_interface_mode", deleteOp: "delete_interface_mode", curVal: cur.mode },
      { key: "ssid", setOp: "set_interface_ssid", deleteOp: "delete_interface_ssid", curVal: cur.ssid },
      { key: "channel", setOp: "set_interface_channel", deleteOp: "delete_interface_channel", curVal: cur.channel },
      { key: "description", setOp: "set_interface_description", deleteOp: "delete_interface_description", curVal: cur.description },
      { key: "mac", setOp: "set_interface_mac", deleteOp: "delete_interface_mac", curVal: cur.mac },
      { key: "hw_id", setOp: "set_interface_hw_id", deleteOp: "delete_interface_hw_id", curVal: cur.hw_id },
      { key: "physical_device", setOp: "set_interface_physical_device", deleteOp: "delete_interface_physical_device", curVal: cur.physical_device },
      { key: "vrf", setOp: "set_interface_vrf", deleteOp: "delete_interface_vrf", curVal: cur.vrf },
      { key: "mtu", setOp: "set_interface_mtu", deleteOp: "delete_interface_mtu", curVal: cur.mtu },
      { key: "max_stations", setOp: "set_max_stations", deleteOp: "delete_max_stations", curVal: cur.max_stations },
      { key: "mgmt_frame_protection", setOp: "set_mgmt_frame_protection", deleteOp: "delete_mgmt_frame_protection", curVal: cur.mgmt_frame_protection },
      { key: "ip_source_validation", setOp: "set_ip_source_validation", deleteOp: "delete_ip_source_validation", curVal: cur.ip_source_validation },
      { key: "ip_arp_cache_timeout", setOp: "set_ip_arp_cache_timeout", deleteOp: "delete_ip_arp_cache_timeout", curVal: cur.ip_arp_cache_timeout },
      { key: "mirror_ingress", setOp: "set_mirror_ingress", deleteOp: "delete_mirror_ingress", curVal: cur.mirror_ingress },
      { key: "mirror_egress", setOp: "set_mirror_egress", deleteOp: "delete_mirror_egress", curVal: cur.mirror_egress },
      { key: "redirect", setOp: "set_redirect", deleteOp: "delete_redirect", curVal: cur.redirect },
      { key: "country_code", setOp: "set_country_code", deleteOp: "delete_country_code", curVal: cur.country_code },
      { key: "bssid", setOp: "set_bssid", deleteOp: "delete_bssid", curVal: cur.bssid },
      { key: "wpa_mode", setOp: "set_security_wpa_mode", deleteOp: "delete_security_wpa_mode", curVal: curWpa?.mode ?? null },
      { key: "wpa_passphrase", setOp: "set_security_wpa_passphrase", deleteOp: "delete_security_wpa_passphrase", curVal: curWpa?.passphrase ?? null },
      { key: "wpa_group_cipher", setOp: "set_security_wpa_group_cipher", deleteOp: "delete_security_wpa_group_cipher", curVal: curWpa?.group_cipher ?? null },
      { key: "wpa_group_mgmt_cipher", setOp: "set_security_wpa_group_mgmt_cipher", deleteOp: "delete_security_wpa_group_mgmt_cipher", curVal: curWpa?.group_mgmt_cipher ?? null },
      { key: "wpa_radius_source_address", setOp: "set_security_wpa_radius_source_address", deleteOp: "delete_security_wpa_radius_source_address", curVal: curWpa?.radius_source_address ?? null },
      { key: "station_address_mode", setOp: "set_security_station_address_mode", deleteOp: "delete_security_station_address_mode", curVal: curSec?.station_address?.mode ?? null },
      { key: "ht_smps", setOp: "set_cap_ht_smps", deleteOp: "delete_cap_ht_smps", curVal: curHt?.smps ?? null },
      { key: "ht_max_amsdu", setOp: "set_cap_ht_max_amsdu", deleteOp: "delete_cap_ht_max_amsdu", curVal: curHt?.max_amsdu ?? null },
      { key: "ht_stbc_rx", setOp: "set_cap_ht_stbc_rx", deleteOp: "delete_cap_ht_stbc_rx", curVal: curHt?.stbc_rx ?? null },
      { key: "vht_channel_set_width", setOp: "set_cap_vht_channel_set_width", deleteOp: "delete_cap_vht_channel_set_width", curVal: curVht?.channel_set_width ?? null },
      { key: "vht_center_channel_freq_1", setOp: "set_cap_vht_center_channel_freq_1", deleteOp: "delete_cap_vht_center_channel_freq_1", curVal: curVht?.center_channel_freq_1 ?? null },
      { key: "vht_center_channel_freq_2", setOp: "set_cap_vht_center_channel_freq_2", deleteOp: "delete_cap_vht_center_channel_freq_2", curVal: curVht?.center_channel_freq_2 ?? null },
      { key: "vht_antenna_count", setOp: "set_cap_vht_antenna_count", deleteOp: "delete_cap_vht_antenna_count", curVal: curVht?.antenna_count ?? null },
      { key: "vht_max_mpdu", setOp: "set_cap_vht_max_mpdu", deleteOp: "delete_cap_vht_max_mpdu", curVal: curVht?.max_mpdu ?? null },
      { key: "vht_max_mpdu_exp", setOp: "set_cap_vht_max_mpdu_exp", deleteOp: "delete_cap_vht_max_mpdu_exp", curVal: curVht?.max_mpdu_exp ?? null },
      { key: "vht_link_adaptation", setOp: "set_cap_vht_link_adaptation", deleteOp: "delete_cap_vht_link_adaptation", curVal: curVht?.link_adaptation ?? null },
      { key: "vht_stbc_rx", setOp: "set_cap_vht_stbc_rx", deleteOp: "delete_cap_vht_stbc_rx", curVal: curVht?.stbc_rx ?? null },
      { key: "he_channel_set_width", setOp: "set_cap_he_channel_set_width", deleteOp: "delete_cap_he_channel_set_width", curVal: curHe?.channel_set_width ?? null },
      { key: "he_coding_scheme", setOp: "set_cap_he_coding_scheme", deleteOp: "delete_cap_he_coding_scheme", curVal: curHe?.coding_scheme ?? null },
      { key: "he_bss_color", setOp: "set_cap_he_bss_color", deleteOp: "delete_cap_he_bss_color", curVal: curHe?.bss_color ?? null },
      { key: "he_center_channel_freq_1", setOp: "set_cap_he_center_channel_freq_1", deleteOp: "delete_cap_he_center_channel_freq_1", curVal: curHe?.center_channel_freq_1 ?? null },
      { key: "he_center_channel_freq_2", setOp: "set_cap_he_center_channel_freq_2", deleteOp: "delete_cap_he_center_channel_freq_2", curVal: curHe?.center_channel_freq_2 ?? null },
    ];

    for (const f of strFields) {
      if (f.key in updated) {
        const newVal = updated[f.key] as string | null | undefined;
        if (newVal) {
          ops.push({ op: f.setOp, value: newVal });
        } else if (f.curVal) {
          ops.push({ op: f.deleteOp });
        }
      }
    }

    // Boolean flags
    const boolFlags: Array<{ key: keyof typeof updated; setOp: string; deleteOp: string; curVal: boolean }> = [
      { key: "disable", setOp: "set_interface_disable", deleteOp: "delete_interface_disable", curVal: cur.disable },
      { key: "disable_broadcast_ssid", setOp: "set_disable_broadcast_ssid", deleteOp: "delete_disable_broadcast_ssid", curVal: cur.disable_broadcast_ssid },
      { key: "expunge_failing_stations", setOp: "set_expunge_failing_stations", deleteOp: "delete_expunge_failing_stations", curVal: cur.expunge_failing_stations },
      { key: "isolate_stations", setOp: "set_isolate_stations", deleteOp: "delete_isolate_stations", curVal: cur.isolate_stations },
      { key: "per_client_thread", setOp: "set_per_client_thread", deleteOp: "delete_per_client_thread", curVal: cur.per_client_thread },
      { key: "reduce_transmit_power", setOp: "set_reduce_transmit_power", deleteOp: "delete_reduce_transmit_power", curVal: cur.reduce_transmit_power },
      { key: "stationary_ap", setOp: "set_stationary_ap", deleteOp: "delete_stationary_ap", curVal: cur.stationary_ap },
      { key: "enable_bf_protection", setOp: "set_enable_bf_protection", deleteOp: "delete_enable_bf_protection", curVal: cur.enable_bf_protection },
      { key: "ip_disable_forwarding", setOp: "set_ip_disable_forwarding", deleteOp: "delete_ip_disable_forwarding", curVal: cur.ip_disable_forwarding },
      { key: "ip_enable_proxy_arp", setOp: "set_ip_enable_proxy_arp", deleteOp: "delete_ip_enable_proxy_arp", curVal: cur.ip_enable_proxy_arp },
      { key: "ipv6_disable_forwarding", setOp: "set_ipv6_disable_forwarding", deleteOp: "delete_ipv6_disable_forwarding", curVal: cur.ipv6_disable_forwarding },
      { key: "ipv6_address_no_default_link_local", setOp: "set_ipv6_address_no_default_link_local", deleteOp: "delete_ipv6_address_no_default_link_local", curVal: cur.ipv6_address_no_default_link_local },
      { key: "ht_mhz_incapable_40", setOp: "set_cap_ht_40mhz_incapable", deleteOp: "delete_cap_ht_40mhz_incapable", curVal: curHt?.mhz_incapable_40 ?? false },
      { key: "ht_auto_powersave", setOp: "set_cap_ht_auto_powersave", deleteOp: "delete_cap_ht_auto_powersave", curVal: curHt?.auto_powersave ?? false },
      { key: "ht_delayed_block_ack", setOp: "set_cap_ht_delayed_block_ack", deleteOp: "delete_cap_ht_delayed_block_ack", curVal: curHt?.delayed_block_ack ?? false },
      { key: "ht_dsss_cck_40", setOp: "set_cap_ht_dsss_cck_40", deleteOp: "delete_cap_ht_dsss_cck_40", curVal: curHt?.dsss_cck_40 ?? false },
      { key: "ht_greenfield", setOp: "set_cap_ht_greenfield", deleteOp: "delete_cap_ht_greenfield", curVal: curHt?.greenfield ?? false },
      { key: "ht_ldpc", setOp: "set_cap_ht_ldpc", deleteOp: "delete_cap_ht_ldpc", curVal: curHt?.ldpc ?? false },
      { key: "ht_lsig_protection", setOp: "set_cap_ht_lsig_protection", deleteOp: "delete_cap_ht_lsig_protection", curVal: curHt?.lsig_protection ?? false },
      { key: "ht_stbc_tx", setOp: "set_cap_ht_stbc_tx", deleteOp: "delete_cap_ht_stbc_tx", curVal: curHt?.stbc_tx ?? false },
      { key: "require_ht", setOp: "set_cap_require_ht", deleteOp: "delete_cap_require_ht", curVal: curCap?.require_ht ?? false },
      { key: "vht_antenna_pattern_fixed", setOp: "set_cap_vht_antenna_pattern_fixed", deleteOp: "delete_cap_vht_antenna_pattern_fixed", curVal: curVht?.antenna_pattern_fixed ?? false },
      { key: "vht_ldpc", setOp: "set_cap_vht_ldpc", deleteOp: "delete_cap_vht_ldpc", curVal: curVht?.ldpc ?? false },
      { key: "vht_stbc_tx", setOp: "set_cap_vht_stbc_tx", deleteOp: "delete_cap_vht_stbc_tx", curVal: curVht?.stbc_tx ?? false },
      { key: "vht_tx_powersave", setOp: "set_cap_vht_tx_powersave", deleteOp: "delete_cap_vht_tx_powersave", curVal: curVht?.tx_powersave ?? false },
      { key: "vht_cf", setOp: "set_cap_vht_vht_cf", deleteOp: "delete_cap_vht_vht_cf", curVal: curVht?.vht_cf ?? false },
      { key: "require_vht", setOp: "set_cap_require_vht", deleteOp: "delete_cap_require_vht", curVal: curCap?.require_vht ?? false },
      { key: "he_antenna_pattern_fixed", setOp: "set_cap_he_antenna_pattern_fixed", deleteOp: "delete_cap_he_antenna_pattern_fixed", curVal: curHe?.antenna_pattern_fixed ?? false },
      { key: "require_he", setOp: "set_cap_require_he", deleteOp: "delete_cap_require_he", curVal: curCap?.require_he ?? false },
      { key: "he_beamform_multi_user", setOp: "set_cap_he_beamform", deleteOp: "delete_cap_he_beamform", curVal: curHe?.beamform?.multi_user_beamformer ?? false },
      { key: "he_beamform_su_beamformee", setOp: "set_cap_he_beamform", deleteOp: "delete_cap_he_beamform", curVal: curHe?.beamform?.single_user_beamformee ?? false },
      { key: "he_beamform_su_beamformer", setOp: "set_cap_he_beamform", deleteOp: "delete_cap_he_beamform", curVal: curHe?.beamform?.single_user_beamformer ?? false },
    ];

    const heBeamformValues: Record<string, string> = {
      he_beamform_multi_user: "multi-user-beamformer",
      he_beamform_su_beamformee: "single-user-beamformee",
      he_beamform_su_beamformer: "single-user-beamformer",
    };

    for (const f of boolFlags) {
      if (f.key in updated) {
        const was = f.curVal;
        const will = (updated[f.key] as boolean | null | undefined) ?? false;
        if (will !== was) {
          const val = heBeamformValues[f.key as string];
          if (val) {
            ops.push({ op: will ? f.setOp : f.deleteOp, value: val });
          } else {
            ops.push({ op: will ? f.setOp : f.deleteOp });
          }
        }
      }
    }

    // Array: addresses
    if ("addresses" in updated && updated.addresses !== undefined) {
      for (const addr of cur.addresses) ops.push({ op: "delete_interface_address", value: addr });
      for (const addr of updated.addresses) ops.push({ op: "set_interface_address", value: addr });
    }

    // Array: IPv6 EUI-64
    if ("ipv6_address_eui64" in updated && updated.ipv6_address_eui64 !== undefined) {
      ops.push({ op: "delete_ipv6_address_eui64_all" });
      for (const p of updated.ipv6_address_eui64) ops.push({ op: "set_ipv6_address_eui64", value: p });
    }

    // Array: WPA ciphers
    if ("wpa_ciphers" in updated && updated.wpa_ciphers !== undefined) {
      ops.push({ op: "delete_security_wpa_cipher_all" });
      for (const c of updated.wpa_ciphers) ops.push({ op: "set_security_wpa_cipher", value: c });
    }

    // Array: WPA RADIUS servers (replace all)
    if ("wpa_radius_servers" in updated && updated.wpa_radius_servers !== undefined) {
      for (const srv of curWpa?.radius_servers ?? []) {
        ops.push({ op: "delete_security_wpa_radius_server", value: srv.server });
      }
      for (const srv of updated.wpa_radius_servers) {
        ops.push({ op: "set_security_wpa_radius_server", value: srv.server });
        if (srv.key) ops.push({ op: "set_security_wpa_radius_server_key", value: `${srv.server}:${srv.key}` });
        if (srv.port) ops.push({ op: "set_security_wpa_radius_server_port", value: `${srv.server}:${srv.port}` });
        if (srv.accounting) ops.push({ op: "set_security_wpa_radius_server_accounting", value: srv.server });
        if (srv.disable) ops.push({ op: "set_security_wpa_radius_server_disable", value: srv.server });
      }
    }

    // Array: WEP keys (replace all)
    if ("wep_keys" in updated && updated.wep_keys !== undefined) {
      ops.push({ op: "delete_security_wep" });
      for (const k of updated.wep_keys) ops.push({ op: "set_security_wep_key", value: k });
    }

    // Array: Station accept MACs
    if ("station_accept_macs" in updated && updated.station_accept_macs !== undefined) {
      ops.push({ op: "delete_security_station_accept_all" });
      for (const m of updated.station_accept_macs) ops.push({ op: "set_security_station_accept_mac", value: m });
    }

    // Array: Station deny MACs
    if ("station_deny_macs" in updated && updated.station_deny_macs !== undefined) {
      ops.push({ op: "delete_security_station_deny_all" });
      for (const m of updated.station_deny_macs) ops.push({ op: "set_security_station_deny_mac", value: m });
    }

    // Array: HT channel set width
    if ("ht_channel_set_width" in updated && updated.ht_channel_set_width !== undefined) {
      ops.push({ op: "delete_cap_ht_channel_set_width_all" });
      for (const w of updated.ht_channel_set_width) ops.push({ op: "set_cap_ht_channel_set_width", value: w });
    }

    // Array: HT short GI
    if ("ht_short_gi" in updated && updated.ht_short_gi !== undefined) {
      ops.push({ op: "delete_cap_ht_short_gi_all" });
      for (const g of updated.ht_short_gi) ops.push({ op: "set_cap_ht_short_gi", value: g });
    }

    // Array: VHT short GI
    if ("vht_short_gi" in updated && updated.vht_short_gi !== undefined) {
      ops.push({ op: "delete_cap_vht_short_gi_all" });
      for (const g of updated.vht_short_gi) ops.push({ op: "set_cap_vht_short_gi", value: g });
    }

    // Array: VHT beamform
    if ("vht_beamform" in updated && updated.vht_beamform !== undefined) {
      ops.push({ op: "delete_cap_vht_beamform_all" });
      for (const b of updated.vht_beamform) ops.push({ op: "set_cap_vht_beamform", value: b });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_interface" }]);
  }
}

export const wirelessService = new WirelessService();
