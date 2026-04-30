"""
Wireless Interface Command Mapper

Handles wireless (WiFi) interface commands for VyOS.
Supports AP, station, and monitor modes with full security and capabilities configuration.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class WirelessInterfaceMapper(BaseFeatureMapper):
    """Wireless interface mapper with all wireless interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "wireless"

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", "wireless", interface]

    # ========================================================================
    # Command Path Methods - Basic
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_type(self, interface: str, type_val: str) -> List[str]:
        return self._base(interface) + ["type", type_val]

    def get_type_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["type"]

    def get_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["mode", mode]

    def get_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mode"]

    def get_ssid(self, interface: str, ssid: str) -> List[str]:
        return self._base(interface) + ["ssid", ssid]

    def get_ssid_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ssid"]

    def get_channel(self, interface: str, channel: str) -> List[str]:
        return self._base(interface) + ["channel", channel]

    def get_channel_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["channel"]

    def get_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["address", address]

    def get_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["address"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mac"]

    def get_hw_id(self, interface: str, hw_id: str) -> List[str]:
        return self._base(interface) + ["hw-id", hw_id]

    def get_hw_id_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["hw-id"]

    def get_physical_device(self, interface: str, phy: str) -> List[str]:
        return self._base(interface) + ["physical-device", phy]

    def get_physical_device_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["physical-device"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

    # ========================================================================
    # AP / Radio Settings
    # ========================================================================

    def get_disable_broadcast_ssid(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable-broadcast-ssid"]

    def get_expunge_failing_stations(self, interface: str) -> List[str]:
        return self._base(interface) + ["expunge-failing-stations"]

    def get_isolate_stations(self, interface: str) -> List[str]:
        return self._base(interface) + ["isolate-stations"]

    def get_max_stations(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["max-stations", count]

    def get_max_stations_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["max-stations"]

    def get_mgmt_frame_protection(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["mgmt-frame-protection", mode]

    def get_mgmt_frame_protection_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mgmt-frame-protection"]

    def get_per_client_thread(self, interface: str) -> List[str]:
        return self._base(interface) + ["per-client-thread"]

    def get_reduce_transmit_power(self, interface: str) -> List[str]:
        return self._base(interface) + ["reduce-transmit-power"]

    def get_stationary_ap(self, interface: str) -> List[str]:
        return self._base(interface) + ["stationary-ap"]

    def get_enable_bf_protection(self, interface: str) -> List[str]:
        return self._base(interface) + ["enable-bf-protection"]

    # ========================================================================
    # Security - WPA
    # ========================================================================

    def get_security_wpa_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "mode", mode]

    def get_security_wpa_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "mode"]

    def get_security_wpa_passphrase(self, interface: str, passphrase: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "passphrase", passphrase]

    def get_security_wpa_passphrase_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "passphrase"]

    def get_security_wpa_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "cipher", cipher]

    def get_security_wpa_cipher_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "cipher"]

    def get_security_wpa_group_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "group-cipher", cipher]

    def get_security_wpa_group_cipher_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "group-cipher"]

    def get_security_wpa_group_mgmt_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "group-mgmt-cipher", cipher]

    def get_security_wpa_group_mgmt_cipher_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "group-mgmt-cipher"]

    def get_security_wpa_radius_server(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "server", server]

    def get_security_wpa_radius_server_key(self, interface: str, server: str, key: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "server", server, "key", key]

    def get_security_wpa_radius_server_port(self, interface: str, server: str, port: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "server", server, "port", port]

    def get_security_wpa_radius_server_accounting(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "server", server, "accounting"]

    def get_security_wpa_radius_server_disable(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "server", server, "disable"]

    def get_security_wpa_radius_source_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "source-address", address]

    def get_security_wpa_radius_source_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa", "radius", "source-address"]

    def get_security_wpa_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wpa"]

    # ========================================================================
    # Security - WEP
    # ========================================================================

    def get_security_wep_key(self, interface: str, key: str) -> List[str]:
        return self._base(interface) + ["security", "wep", "key", key]

    def get_security_wep_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "wep"]

    # ========================================================================
    # Security - Station Address Filtering
    # ========================================================================

    def get_security_station_address_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "mode", mode]

    def get_security_station_address_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "mode"]

    def get_security_station_accept_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "accept", "mac", mac]

    def get_security_station_deny_mac(self, interface: str, mac: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "deny", "mac", mac]

    def get_security_station_accept_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "accept"]

    def get_security_station_deny_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security", "station-address", "deny"]

    def get_security_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["security"]

    # ========================================================================
    # Capabilities - HT (802.11n)
    # ========================================================================

    def get_cap_ht_channel_set_width(self, interface: str, width: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "channel-set-width", width]

    def get_cap_ht_channel_set_width_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "channel-set-width"]

    def get_cap_ht_40mhz_incapable(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "40mhz-incapable"]

    def get_cap_ht_auto_powersave(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "auto-powersave"]

    def get_cap_ht_delayed_block_ack(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "delayed-block-ack"]

    def get_cap_ht_dsss_cck_40(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "dsss-cck-40"]

    def get_cap_ht_greenfield(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "greenfield"]

    def get_cap_ht_ldpc(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "ldpc"]

    def get_cap_ht_lsig_protection(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "lsig-protection"]

    def get_cap_ht_max_amsdu(self, interface: str, size: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "max-amsdu", size]

    def get_cap_ht_max_amsdu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "max-amsdu"]

    def get_cap_ht_short_gi(self, interface: str, width: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "short-gi", width]

    def get_cap_ht_short_gi_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "short-gi"]

    def get_cap_ht_smps(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "smps", mode]

    def get_cap_ht_smps_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "smps"]

    def get_cap_ht_stbc_rx(self, interface: str, streams: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "stbc", "rx", streams]

    def get_cap_ht_stbc_rx_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "stbc", "rx"]

    def get_cap_ht_stbc_tx(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht", "stbc", "tx"]

    def get_cap_ht_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "ht"]

    def get_cap_require_ht(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "require-ht"]

    # ========================================================================
    # Capabilities - VHT (802.11ac)
    # ========================================================================

    def get_cap_vht_antenna_count(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "antenna-count", count]

    def get_cap_vht_antenna_count_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "antenna-count"]

    def get_cap_vht_antenna_pattern_fixed(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "antenna-pattern-fixed"]

    def get_cap_vht_beamform(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "beamform", mode]

    def get_cap_vht_beamform_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "beamform"]

    def get_cap_vht_center_channel_freq_1(self, interface: str, channel: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "center-channel-freq", "freq-1", channel]

    def get_cap_vht_center_channel_freq_1_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "center-channel-freq", "freq-1"]

    def get_cap_vht_center_channel_freq_2(self, interface: str, channel: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "center-channel-freq", "freq-2", channel]

    def get_cap_vht_center_channel_freq_2_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "center-channel-freq", "freq-2"]

    def get_cap_vht_channel_set_width(self, interface: str, width: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "channel-set-width", width]

    def get_cap_vht_channel_set_width_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "channel-set-width"]

    def get_cap_vht_ldpc(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "ldpc"]

    def get_cap_vht_link_adaptation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "link-adaptation", mode]

    def get_cap_vht_link_adaptation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "link-adaptation"]

    def get_cap_vht_max_mpdu_exp(self, interface: str, exp: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "max-mpdu-exp", exp]

    def get_cap_vht_max_mpdu_exp_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "max-mpdu-exp"]

    def get_cap_vht_max_mpdu(self, interface: str, size: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "max-mpdu", size]

    def get_cap_vht_max_mpdu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "max-mpdu"]

    def get_cap_vht_short_gi(self, interface: str, width: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "short-gi", width]

    def get_cap_vht_short_gi_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "short-gi"]

    def get_cap_vht_stbc_rx(self, interface: str, streams: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "stbc", "rx", streams]

    def get_cap_vht_stbc_rx_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "stbc", "rx"]

    def get_cap_vht_stbc_tx(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "stbc", "tx"]

    def get_cap_vht_tx_powersave(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "tx-powersave"]

    def get_cap_vht_vht_cf(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht", "vht-cf"]

    def get_cap_vht_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "vht"]

    def get_cap_require_vht(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "require-vht"]

    # ========================================================================
    # Capabilities - HE (802.11ax)
    # ========================================================================

    def get_cap_he_antenna_pattern_fixed(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "antenna-pattern-fixed"]

    def get_cap_he_beamform(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "beamform", mode]

    def get_cap_he_beamform_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "beamform"]

    def get_cap_he_bss_color(self, interface: str, color: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "bss-color", color]

    def get_cap_he_bss_color_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "bss-color"]

    def get_cap_he_center_channel_freq_1(self, interface: str, channel: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "center-channel-freq", "freq-1", channel]

    def get_cap_he_center_channel_freq_1_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "center-channel-freq", "freq-1"]

    def get_cap_he_center_channel_freq_2(self, interface: str, channel: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "center-channel-freq", "freq-2", channel]

    def get_cap_he_center_channel_freq_2_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "center-channel-freq", "freq-2"]

    def get_cap_he_channel_set_width(self, interface: str, width: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "channel-set-width", width]

    def get_cap_he_channel_set_width_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "channel-set-width"]

    def get_cap_he_coding_scheme(self, interface: str, scheme: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "coding-scheme", scheme]

    def get_cap_he_coding_scheme_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he", "coding-scheme"]

    def get_cap_he_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "he"]

    def get_cap_require_he(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities", "require-he"]

    def get_cap_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["capabilities"]

    # ========================================================================
    # IP Settings
    # ========================================================================

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-proxy-arp"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", timeout]

    def get_ip_arp_cache_timeout_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout"]

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_eui64_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    # ========================================================================
    # Mirror / Redirect
    # ========================================================================

    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    # ========================================================================
    # Config Parsing Methods
    # ========================================================================

    def _parse_multi_value(self, val) -> list:
        """Normalize a VyOS value that may be a string or list."""
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            return [val]
        return []

    def _parse_security(self, security_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the security section of wireless config."""
        if not security_config:
            return {}

        result: Dict[str, Any] = {}

        wpa = security_config.get("wpa", {}) or {}
        if wpa:
            radius = wpa.get("radius", {}) or {}
            radius_servers = []
            for srv_ip, srv_cfg in (radius.get("server", {}) or {}).items():
                if not isinstance(srv_cfg, dict):
                    continue
                radius_servers.append({
                    "server": srv_ip,
                    "key": srv_cfg.get("key"),
                    "port": srv_cfg.get("port"),
                    "accounting": "accounting" in srv_cfg,
                    "disable": "disable" in srv_cfg,
                })
            result["wpa"] = {
                "mode": wpa.get("mode"),
                "passphrase": wpa.get("passphrase"),
                "cipher": self._parse_multi_value(wpa.get("cipher")),
                "group_cipher": wpa.get("group-cipher"),
                "group_mgmt_cipher": wpa.get("group-mgmt-cipher"),
                "radius_servers": radius_servers,
                "radius_source_address": radius.get("source-address"),
            }

        wep = security_config.get("wep", {}) or {}
        if wep:
            result["wep"] = {
                "key": self._parse_multi_value(wep.get("key")),
            }

        station_addr = security_config.get("station-address", {}) or {}
        if station_addr:
            accept_macs = self._parse_multi_value(
                (station_addr.get("accept", {}) or {}).get("mac")
            )
            deny_macs = self._parse_multi_value(
                (station_addr.get("deny", {}) or {}).get("mac")
            )
            result["station_address"] = {
                "mode": station_addr.get("mode"),
                "accept_mac": accept_macs,
                "deny_mac": deny_macs,
            }

        return result

    def _parse_capabilities(self, cap_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the capabilities section of wireless config."""
        if not cap_config:
            return {}

        ht = cap_config.get("ht", {}) or {}
        ht_stbc = ht.get("stbc", {}) or {}
        ht_parsed = {
            "channel_set_width": self._parse_multi_value(ht.get("channel-set-width")),
            "40mhz_incapable": "40mhz-incapable" in ht,
            "auto_powersave": "auto-powersave" in ht,
            "delayed_block_ack": "delayed-block-ack" in ht,
            "dsss_cck_40": "dsss-cck-40" in ht,
            "greenfield": "greenfield" in ht,
            "ldpc": "ldpc" in ht,
            "lsig_protection": "lsig-protection" in ht,
            "max_amsdu": ht.get("max-amsdu"),
            "short_gi": self._parse_multi_value(ht.get("short-gi")),
            "smps": ht.get("smps"),
            "stbc_rx": ht_stbc.get("rx"),
            "stbc_tx": "tx" in ht_stbc,
        } if ht else None

        vht = cap_config.get("vht", {}) or {}
        vht_stbc = vht.get("stbc", {}) or {}
        vht_parsed = {
            "antenna_count": vht.get("antenna-count"),
            "antenna_pattern_fixed": "antenna-pattern-fixed" in vht,
            "beamform": self._parse_multi_value(vht.get("beamform")),
            "center_channel_freq_1": (vht.get("center-channel-freq", {}) or {}).get("freq-1"),
            "center_channel_freq_2": (vht.get("center-channel-freq", {}) or {}).get("freq-2"),
            "channel_set_width": vht.get("channel-set-width"),
            "ldpc": "ldpc" in vht,
            "link_adaptation": vht.get("link-adaptation"),
            "max_mpdu_exp": vht.get("max-mpdu-exp"),
            "max_mpdu": vht.get("max-mpdu"),
            "short_gi": self._parse_multi_value(vht.get("short-gi")),
            "stbc_rx": vht_stbc.get("rx"),
            "stbc_tx": "tx" in vht_stbc,
            "tx_powersave": "tx-powersave" in vht,
            "vht_cf": "vht-cf" in vht,
        } if vht else None

        he = cap_config.get("he", {}) or {}
        he_beamform = he.get("beamform", {}) or {}
        he_parsed = {
            "antenna_pattern_fixed": "antenna-pattern-fixed" in he,
            "beamform": {
                "multi_user_beamformer": "multi-user-beamformer" in he_beamform,
                "single_user_beamformee": "single-user-beamformee" in he_beamform,
                "single_user_beamformer": "single-user-beamformer" in he_beamform,
            } if he_beamform else None,
            "bss_color": he.get("bss-color"),
            "center_channel_freq_1": (he.get("center-channel-freq", {}) or {}).get("freq-1"),
            "center_channel_freq_2": (he.get("center-channel-freq", {}) or {}).get("freq-2"),
            "channel_set_width": he.get("channel-set-width"),
            "coding_scheme": he.get("coding-scheme"),
        } if he else None

        return {
            "ht": ht_parsed,
            "vht": vht_parsed,
            "he": he_parsed,
            "require_ht": "require-ht" in cap_config,
            "require_vht": "require-vht" in cap_config,
            "require_he": "require-he" in cap_config,
        }

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single wireless interface configuration from VyOS."""
        addresses = self._parse_multi_value(config.get("address"))

        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_addr_config = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}

        eui64 = self._parse_multi_value(ipv6_addr_config.get("eui64"))

        return {
            "name": name,
            "type": self.interface_type,
            "wireless_type": config.get("type"),
            "mode": config.get("mode"),
            "ssid": config.get("ssid"),
            "channel": config.get("channel"),
            "description": config.get("description"),
            "disable": "disable" in config,
            "mac": config.get("mac"),
            "hw_id": config.get("hw-id"),
            "physical_device": config.get("physical-device"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "addresses": addresses,
            # AP settings
            "disable_broadcast_ssid": "disable-broadcast-ssid" in config,
            "expunge_failing_stations": "expunge-failing-stations" in config,
            "isolate_stations": "isolate-stations" in config,
            "max_stations": config.get("max-stations"),
            "mgmt_frame_protection": config.get("mgmt-frame-protection"),
            "per_client_thread": "per-client-thread" in config,
            "reduce_transmit_power": "reduce-transmit-power" in config,
            "stationary_ap": "stationary-ap" in config,
            "enable_bf_protection": "enable-bf-protection" in config,
            # IP settings
            "ip_disable_forwarding": "disable-forwarding" in ip_config,
            "ip_source_validation": ip_config.get("source-validation"),
            "ip_enable_proxy_arp": "enable-proxy-arp" in ip_config,
            "ip_arp_cache_timeout": ip_config.get("arp-cache-timeout"),
            # IPv6 settings
            "ipv6_disable_forwarding": "disable-forwarding" in ipv6_config,
            "ipv6_address_eui64": eui64,
            "ipv6_address_no_default_link_local": "no-default-link-local" in ipv6_addr_config,
            # Mirror / redirect
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
            "redirect": config.get("redirect"),
            # Security
            "security": self._parse_security(config.get("security", {}) or {}),
            # Capabilities
            "capabilities": self._parse_capabilities(config.get("capabilities", {}) or {}),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all wireless interfaces."""
        interfaces = []
        by_vrf: Dict[str, int] = {}
        by_wireless_type: Dict[str, int] = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            wt = interface.get("wireless_type") or "unknown"
            by_wireless_type[wt] = by_wireless_type.get(wt, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {"wireless": len(interfaces)},
            "by_wireless_type": by_wireless_type,
            "by_vrf": by_vrf,
        }
