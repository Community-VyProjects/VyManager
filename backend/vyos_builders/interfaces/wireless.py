"""
Wireless Interface Batch Builder

Provides all wireless interface batch operations covering:
- Basic interface settings (type, mode, ssid, channel, mac, etc.)
- AP-specific settings (broadcast SSID, station isolation, MFP, etc.)
- Security (WPA personal/enterprise, WEP, station MAC filtering)
- Capabilities (HT/802.11n, VHT/802.11ac, HE/802.11ax)
- IP/IPv6 settings, mirror, redirect
- Version-specific: country-code (v1.4), bssid (v1.5)
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class WirelessInterfaceBuilderMixin:
    """Complete batch builder for wireless interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "interface_wireless"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "WirelessInterfaceBuilderMixin":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "WirelessInterfaceBuilderMixin":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "WirelessInterfaceBuilderMixin":
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "features": {
                "type": {"supported": True, "description": "Wireless device type (access-point/station/monitor)"},
                "mode": {"supported": True, "description": "Radio mode (a/b/g/n/ac/ax)"},
                "ssid": {"supported": True, "description": "SSID (network name)"},
                "channel": {"supported": True, "description": "Wireless channel (0=ACS, 1-14 2.4GHz, 34-177 5GHz, 1-233 6GHz)"},
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "mac": {"supported": True, "description": "MAC address override"},
                "hw_id": {"supported": True, "description": "Hardware MAC address (read-only identifier)"},
                "physical_device": {"supported": True, "description": "Underlying physical WiFi device (phy0, phy1, etc.)"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "mtu": {"supported": True, "description": "MTU configuration"},
                "address": {"supported": True, "description": "IPv4/IPv6 address assignment"},
                "disable_broadcast_ssid": {"supported": True, "description": "Hide SSID from beacon frames"},
                "expunge_failing_stations": {"supported": True, "description": "Disassociate stations with excessive failures"},
                "isolate_stations": {"supported": True, "description": "Prevent stations from communicating with each other"},
                "max_stations": {"supported": True, "description": "Maximum number of connected stations"},
                "mgmt_frame_protection": {"supported": True, "description": "802.11w Management Frame Protection (disabled/optional/required)"},
                "per_client_thread": {"supported": True, "description": "Use separate thread per client (improves performance)"},
                "reduce_transmit_power": {"supported": True, "description": "Reduce transmit power for regulatory compliance"},
                "stationary_ap": {"supported": True, "description": "Optimize for stationary AP (disables mobility features)"},
                "enable_bf_protection": {"supported": True, "description": "Enable beacon frame protection"},
                "security_wpa": {"supported": True, "description": "WPA/WPA2/WPA3 security"},
                "security_wep": {"supported": True, "description": "WEP security (legacy, not recommended)"},
                "security_station_address": {"supported": True, "description": "MAC-based station access control"},
                "capabilities_ht": {"supported": True, "description": "HT (802.11n) capabilities"},
                "capabilities_vht": {"supported": True, "description": "VHT (802.11ac) capabilities"},
                "capabilities_he": {"supported": True, "description": "HE (802.11ax/WiFi 6) capabilities"},
                "ip_disable_forwarding": {"supported": True, "description": "Disable IPv4 forwarding"},
                "ip_source_validation": {"supported": True, "description": "Source validation (strict/loose/disable)"},
                "ip_enable_proxy_arp": {"supported": True, "description": "Enable proxy ARP"},
                "ipv6_disable_forwarding": {"supported": True, "description": "Disable IPv6 forwarding"},
                "ipv6_address_eui64": {"supported": True, "description": "IPv6 EUI-64 address generation"},
                "ipv6_address_no_default_link_local": {"supported": True, "description": "Remove default link-local address"},
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
                "redirect": {"supported": True, "description": "Redirect incoming packets"},
                "bssid": {"supported": is_v15, "description": "BSSID for station mode (VyOS 1.5+)"},
                "country_code": {"supported": not is_v15, "description": "Regulatory country code (VyOS 1.4)"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def set_interface_type(self, interface: str, type_val: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_type(interface, type_val)
        return self.add_set(path)

    def delete_interface_type(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_type_path(interface)
        return self.add_delete(path)

    def set_interface_mode(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mode(interface, mode)
        return self.add_set(path)

    def delete_interface_mode(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mode_path(interface)
        return self.add_delete(path)

    def set_interface_ssid(self, interface: str, ssid: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ssid(interface, ssid)
        return self.add_set(path)

    def delete_interface_ssid(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ssid_path(interface)
        return self.add_delete(path)

    def set_interface_channel(self, interface: str, channel: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_channel(interface, channel)
        return self.add_set(path)

    def delete_interface_channel(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_channel_path(interface)
        return self.add_delete(path)

    def set_interface_description(self, interface: str, description: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_mac(self, interface: str, mac: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mac(interface, mac)
        return self.add_set(path)

    def delete_interface_mac(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mac_path(interface)
        return self.add_delete(path)

    def set_interface_hw_id(self, interface: str, hw_id: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_hw_id(interface, hw_id)
        return self.add_set(path)

    def delete_interface_hw_id(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_hw_id_path(interface)
        return self.add_delete(path)

    def set_interface_physical_device(self, interface: str, phy: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_physical_device(interface, phy)
        return self.add_set(path)

    def delete_interface_physical_device(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_physical_device_path(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_vrf_path(interface)
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_interface(interface)
        return self.add_delete(path)

    # ========================================================================
    # AP / Radio Settings
    # ========================================================================

    def set_disable_broadcast_ssid(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_disable_broadcast_ssid(interface)
        return self.add_set(path)

    def delete_disable_broadcast_ssid(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_disable_broadcast_ssid(interface)
        return self.add_delete(path)

    def set_expunge_failing_stations(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_expunge_failing_stations(interface)
        return self.add_set(path)

    def delete_expunge_failing_stations(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_expunge_failing_stations(interface)
        return self.add_delete(path)

    def set_isolate_stations(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_isolate_stations(interface)
        return self.add_set(path)

    def delete_isolate_stations(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_isolate_stations(interface)
        return self.add_delete(path)

    def set_max_stations(self, interface: str, count: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_max_stations(interface, count)
        return self.add_set(path)

    def delete_max_stations(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_max_stations_path(interface)
        return self.add_delete(path)

    def set_mgmt_frame_protection(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mgmt_frame_protection(interface, mode)
        return self.add_set(path)

    def delete_mgmt_frame_protection(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mgmt_frame_protection_path(interface)
        return self.add_delete(path)

    def set_per_client_thread(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_per_client_thread(interface)
        return self.add_set(path)

    def delete_per_client_thread(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_per_client_thread(interface)
        return self.add_delete(path)

    def set_reduce_transmit_power(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_reduce_transmit_power(interface)
        return self.add_set(path)

    def delete_reduce_transmit_power(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_reduce_transmit_power(interface)
        return self.add_delete(path)

    def set_stationary_ap(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_stationary_ap(interface)
        return self.add_set(path)

    def delete_stationary_ap(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_stationary_ap(interface)
        return self.add_delete(path)

    def set_enable_bf_protection(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_enable_bf_protection(interface)
        return self.add_set(path)

    def delete_enable_bf_protection(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_enable_bf_protection(interface)
        return self.add_delete(path)

    # ========================================================================
    # Security - WPA
    # ========================================================================

    def set_security_wpa_mode(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_mode(interface, mode)
        return self.add_set(path)

    def delete_security_wpa_mode(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_mode_path(interface)
        return self.add_delete(path)

    def set_security_wpa_passphrase(self, interface: str, passphrase: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_passphrase(interface, passphrase)
        return self.add_set(path)

    def delete_security_wpa_passphrase(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_passphrase_path(interface)
        return self.add_delete(path)

    def set_security_wpa_cipher(self, interface: str, cipher: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_cipher(interface, cipher)
        return self.add_set(path)

    def delete_security_wpa_cipher(self, interface: str, cipher: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_cipher(interface, cipher)
        return self.add_delete(path)

    def delete_security_wpa_cipher_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_cipher_path(interface)
        return self.add_delete(path)

    def set_security_wpa_group_cipher(self, interface: str, cipher: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_group_cipher(interface, cipher)
        return self.add_set(path)

    def delete_security_wpa_group_cipher(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_group_cipher_path(interface)
        return self.add_delete(path)

    def set_security_wpa_group_mgmt_cipher(self, interface: str, cipher: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_group_mgmt_cipher(interface, cipher)
        return self.add_set(path)

    def delete_security_wpa_group_mgmt_cipher(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_group_mgmt_cipher_path(interface)
        return self.add_delete(path)

    def set_security_wpa_radius_server(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server(interface, server)
        return self.add_set(path)

    def delete_security_wpa_radius_server(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server(interface, server)
        return self.add_delete(path)

    def set_security_wpa_radius_server_key(self, interface: str, server_and_key: str) -> "WirelessInterfaceBuilderMixin":
        parts = server_and_key.split(":", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_security_wpa_radius_server_key(interface, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_security_wpa_radius_server_port(self, interface: str, server_and_port: str) -> "WirelessInterfaceBuilderMixin":
        parts = server_and_port.split(":", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_security_wpa_radius_server_port(interface, parts[0], parts[1])
            return self.add_set(path)
        return self

    def set_security_wpa_radius_server_accounting(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server_accounting(interface, server)
        return self.add_set(path)

    def delete_security_wpa_radius_server_accounting(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server_accounting(interface, server)
        return self.add_delete(path)

    def set_security_wpa_radius_server_disable(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server_disable(interface, server)
        return self.add_set(path)

    def delete_security_wpa_radius_server_disable(self, interface: str, server: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_server_disable(interface, server)
        return self.add_delete(path)

    def set_security_wpa_radius_source_address(self, interface: str, address: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_source_address(interface, address)
        return self.add_set(path)

    def delete_security_wpa_radius_source_address(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_radius_source_address_path(interface)
        return self.add_delete(path)

    def delete_security_wpa(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wpa_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Security - WEP
    # ========================================================================

    def set_security_wep_key(self, interface: str, key: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wep_key(interface, key)
        return self.add_set(path)

    def delete_security_wep(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_wep_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Security - Station Address Filtering
    # ========================================================================

    def set_security_station_address_mode(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_address_mode(interface, mode)
        return self.add_set(path)

    def delete_security_station_address_mode(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_address_mode_path(interface)
        return self.add_delete(path)

    def set_security_station_accept_mac(self, interface: str, mac: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_accept_mac(interface, mac)
        return self.add_set(path)

    def delete_security_station_accept_mac(self, interface: str, mac: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_accept_mac(interface, mac)
        return self.add_delete(path)

    def delete_security_station_accept_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_accept_path(interface)
        return self.add_delete(path)

    def set_security_station_deny_mac(self, interface: str, mac: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_deny_mac(interface, mac)
        return self.add_set(path)

    def delete_security_station_deny_mac(self, interface: str, mac: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_deny_mac(interface, mac)
        return self.add_delete(path)

    def delete_security_station_deny_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_station_deny_path(interface)
        return self.add_delete(path)

    def delete_security(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_security_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities - HT (802.11n)
    # ========================================================================

    def set_cap_ht_channel_set_width(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_channel_set_width(interface, width)
        return self.add_set(path)

    def delete_cap_ht_channel_set_width(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_channel_set_width(interface, width)
        return self.add_delete(path)

    def delete_cap_ht_channel_set_width_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_channel_set_width_path(interface)
        return self.add_delete(path)

    def set_cap_ht_40mhz_incapable(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_40mhz_incapable(interface))

    def delete_cap_ht_40mhz_incapable(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_40mhz_incapable(interface))

    def set_cap_ht_auto_powersave(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_auto_powersave(interface))

    def delete_cap_ht_auto_powersave(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_auto_powersave(interface))

    def set_cap_ht_delayed_block_ack(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_delayed_block_ack(interface))

    def delete_cap_ht_delayed_block_ack(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_delayed_block_ack(interface))

    def set_cap_ht_dsss_cck_40(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_dsss_cck_40(interface))

    def delete_cap_ht_dsss_cck_40(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_dsss_cck_40(interface))

    def set_cap_ht_greenfield(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_greenfield(interface))

    def delete_cap_ht_greenfield(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_greenfield(interface))

    def set_cap_ht_ldpc(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_ldpc(interface))

    def delete_cap_ht_ldpc(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_ldpc(interface))

    def set_cap_ht_lsig_protection(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_lsig_protection(interface))

    def delete_cap_ht_lsig_protection(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_lsig_protection(interface))

    def set_cap_ht_max_amsdu(self, interface: str, size: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_max_amsdu(interface, size)
        return self.add_set(path)

    def delete_cap_ht_max_amsdu(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_max_amsdu_path(interface)
        return self.add_delete(path)

    def set_cap_ht_short_gi(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_short_gi(interface, width)
        return self.add_set(path)

    def delete_cap_ht_short_gi(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_short_gi(interface, width)
        return self.add_delete(path)

    def delete_cap_ht_short_gi_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_short_gi_path(interface)
        return self.add_delete(path)

    def set_cap_ht_smps(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_smps(interface, mode)
        return self.add_set(path)

    def delete_cap_ht_smps(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_smps_path(interface)
        return self.add_delete(path)

    def set_cap_ht_stbc_rx(self, interface: str, streams: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_stbc_rx(interface, streams)
        return self.add_set(path)

    def delete_cap_ht_stbc_rx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_stbc_rx_path(interface)
        return self.add_delete(path)

    def set_cap_ht_stbc_tx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_ht_stbc_tx(interface))

    def delete_cap_ht_stbc_tx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_ht_stbc_tx(interface))

    def delete_cap_ht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_ht_path(interface)
        return self.add_delete(path)

    def set_cap_require_ht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_require_ht(interface))

    def delete_cap_require_ht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_require_ht(interface))

    # ========================================================================
    # Capabilities - VHT (802.11ac)
    # ========================================================================

    def set_cap_vht_antenna_count(self, interface: str, count: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_antenna_count(interface, count)
        return self.add_set(path)

    def delete_cap_vht_antenna_count(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_antenna_count_path(interface)
        return self.add_delete(path)

    def set_cap_vht_antenna_pattern_fixed(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_vht_antenna_pattern_fixed(interface))

    def delete_cap_vht_antenna_pattern_fixed(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_vht_antenna_pattern_fixed(interface))

    def set_cap_vht_beamform(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_beamform(interface, mode)
        return self.add_set(path)

    def delete_cap_vht_beamform(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_beamform(interface, mode)
        return self.add_delete(path)

    def delete_cap_vht_beamform_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_beamform_path(interface)
        return self.add_delete(path)

    def set_cap_vht_center_channel_freq_1(self, interface: str, channel: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_center_channel_freq_1(interface, channel)
        return self.add_set(path)

    def delete_cap_vht_center_channel_freq_1(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_center_channel_freq_1_path(interface)
        return self.add_delete(path)

    def set_cap_vht_center_channel_freq_2(self, interface: str, channel: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_center_channel_freq_2(interface, channel)
        return self.add_set(path)

    def delete_cap_vht_center_channel_freq_2(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_center_channel_freq_2_path(interface)
        return self.add_delete(path)

    def set_cap_vht_channel_set_width(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_channel_set_width(interface, width)
        return self.add_set(path)

    def delete_cap_vht_channel_set_width(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_channel_set_width_path(interface)
        return self.add_delete(path)

    def set_cap_vht_ldpc(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_vht_ldpc(interface))

    def delete_cap_vht_ldpc(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_vht_ldpc(interface))

    def set_cap_vht_link_adaptation(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_link_adaptation(interface, mode)
        return self.add_set(path)

    def delete_cap_vht_link_adaptation(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_link_adaptation_path(interface)
        return self.add_delete(path)

    def set_cap_vht_max_mpdu_exp(self, interface: str, exp: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_max_mpdu_exp(interface, exp)
        return self.add_set(path)

    def delete_cap_vht_max_mpdu_exp(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_max_mpdu_exp_path(interface)
        return self.add_delete(path)

    def set_cap_vht_max_mpdu(self, interface: str, size: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_max_mpdu(interface, size)
        return self.add_set(path)

    def delete_cap_vht_max_mpdu(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_max_mpdu_path(interface)
        return self.add_delete(path)

    def set_cap_vht_short_gi(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_short_gi(interface, width)
        return self.add_set(path)

    def delete_cap_vht_short_gi(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_short_gi(interface, width)
        return self.add_delete(path)

    def delete_cap_vht_short_gi_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_short_gi_path(interface)
        return self.add_delete(path)

    def set_cap_vht_stbc_rx(self, interface: str, streams: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_stbc_rx(interface, streams)
        return self.add_set(path)

    def delete_cap_vht_stbc_rx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_stbc_rx_path(interface)
        return self.add_delete(path)

    def set_cap_vht_stbc_tx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_vht_stbc_tx(interface))

    def delete_cap_vht_stbc_tx(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_vht_stbc_tx(interface))

    def set_cap_vht_tx_powersave(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_vht_tx_powersave(interface))

    def delete_cap_vht_tx_powersave(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_vht_tx_powersave(interface))

    def set_cap_vht_vht_cf(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_vht_vht_cf(interface))

    def delete_cap_vht_vht_cf(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_vht_vht_cf(interface))

    def delete_cap_vht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_vht_path(interface)
        return self.add_delete(path)

    def set_cap_require_vht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_require_vht(interface))

    def delete_cap_require_vht(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_require_vht(interface))

    # ========================================================================
    # Capabilities - HE (802.11ax)
    # ========================================================================

    def set_cap_he_antenna_pattern_fixed(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_he_antenna_pattern_fixed(interface))

    def delete_cap_he_antenna_pattern_fixed(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_he_antenna_pattern_fixed(interface))

    def set_cap_he_beamform(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_beamform(interface, mode)
        return self.add_set(path)

    def delete_cap_he_beamform(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_beamform(interface, mode)
        return self.add_delete(path)

    def delete_cap_he_beamform_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_beamform_path(interface)
        return self.add_delete(path)

    def set_cap_he_bss_color(self, interface: str, color: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_bss_color(interface, color)
        return self.add_set(path)

    def delete_cap_he_bss_color(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_bss_color_path(interface)
        return self.add_delete(path)

    def set_cap_he_center_channel_freq_1(self, interface: str, channel: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_center_channel_freq_1(interface, channel)
        return self.add_set(path)

    def delete_cap_he_center_channel_freq_1(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_center_channel_freq_1_path(interface)
        return self.add_delete(path)

    def set_cap_he_center_channel_freq_2(self, interface: str, channel: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_center_channel_freq_2(interface, channel)
        return self.add_set(path)

    def delete_cap_he_center_channel_freq_2(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_center_channel_freq_2_path(interface)
        return self.add_delete(path)

    def set_cap_he_channel_set_width(self, interface: str, width: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_channel_set_width(interface, width)
        return self.add_set(path)

    def delete_cap_he_channel_set_width(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_channel_set_width_path(interface)
        return self.add_delete(path)

    def set_cap_he_coding_scheme(self, interface: str, scheme: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_coding_scheme(interface, scheme)
        return self.add_set(path)

    def delete_cap_he_coding_scheme(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_coding_scheme_path(interface)
        return self.add_delete(path)

    def delete_cap_he(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_he_path(interface)
        return self.add_delete(path)

    def set_cap_require_he(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_cap_require_he(interface))

    def delete_cap_require_he(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_cap_require_he(interface))

    def delete_capabilities(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_cap_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_ip_disable_forwarding(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ip_disable_forwarding(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ip_source_validation(self, interface: str, mode: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_set(self.mappers[self.mapper_key].get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        return self.add_delete(self.mappers[self.mapper_key].get_ip_enable_proxy_arp(interface))

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def delete_ip_arp_cache_timeout(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ip_arp_cache_timeout_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_ipv6_disable_forwarding(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def delete_ipv6_disable_forwarding(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_delete(path)

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_set(path)

    def delete_ipv6_address_eui64(self, interface: str, prefix: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_address_eui64(interface, prefix)
        return self.add_delete(path)

    def delete_ipv6_address_eui64_all(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_address_eui64_path(interface)
        return self.add_delete(path)

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_set(path)

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_ipv6_address_no_default_link_local(interface)
        return self.add_delete(path)

    # ========================================================================
    # Mirror / Redirect
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mirror_ingress(interface, destination)
        return self.add_set(path)

    def delete_mirror_ingress(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mirror_ingress_path(interface)
        return self.add_delete(path)

    def set_mirror_egress(self, interface: str, destination: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mirror_egress(interface, destination)
        return self.add_set(path)

    def delete_mirror_egress(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_mirror_egress_path(interface)
        return self.add_delete(path)

    def set_redirect(self, interface: str, destination: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_redirect(interface, destination)
        return self.add_set(path)

    def delete_redirect(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        path = self.mappers[self.mapper_key].get_redirect_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Version-Specific Operations
    # ========================================================================

    def set_country_code(self, interface: str, code: str) -> "WirelessInterfaceBuilderMixin":
        """VyOS 1.4 only: set regulatory country code."""
        path = self.mappers[self.mapper_key].get_country_code(interface, code)
        return self.add_set(path)

    def delete_country_code(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        """VyOS 1.4 only: delete regulatory country code."""
        path = self.mappers[self.mapper_key].get_country_code_path(interface)
        return self.add_delete(path)

    def set_bssid(self, interface: str, bssid: str) -> "WirelessInterfaceBuilderMixin":
        """VyOS 1.5 only: set target BSSID for station mode."""
        path = self.mappers[self.mapper_key].get_bssid(interface, bssid)
        return self.add_set(path)

    def delete_bssid(self, interface: str) -> "WirelessInterfaceBuilderMixin":
        """VyOS 1.5 only: delete BSSID setting."""
        path = self.mappers[self.mapper_key].get_bssid_path(interface)
        return self.add_delete(path)
