"""IPoE Server Command Mapper."""
from typing import List, Dict, Any
from ..base import BaseFeatureMapper

BASE = ["service", "ipoe-server"]


class IPoEServerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_description(self, value: str) -> List[str]:
        return BASE + ["description", value]

    def get_description_delete(self) -> List[str]:
        return BASE + ["description"]

    def get_default_pool(self, name: str) -> List[str]:
        return BASE + ["default-pool", name]

    def get_default_pool_delete(self) -> List[str]:
        return BASE + ["default-pool"]

    def get_default_ipv6_pool(self, name: str) -> List[str]:
        return BASE + ["default-ipv6-pool", name]

    def get_default_ipv6_pool_delete(self) -> List[str]:
        return BASE + ["default-ipv6-pool"]

    def get_gateway_address(self, address: str) -> List[str]:
        return BASE + ["gateway-address", address]

    def get_gateway_address_delete(self, address: str) -> List[str]:
        return BASE + ["gateway-address", address]

    def get_gateway_address_all_delete(self) -> List[str]:
        return BASE + ["gateway-address"]

    def get_name_server(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_name_server_delete(self, address: str) -> List[str]:
        return BASE + ["name-server", address]

    def get_max_concurrent_sessions(self, value: str) -> List[str]:
        return BASE + ["max-concurrent-sessions", value]

    def get_max_concurrent_sessions_delete(self) -> List[str]:
        return BASE + ["max-concurrent-sessions"]

    def get_thread_count(self, value: str) -> List[str]:
        return BASE + ["thread-count", value]

    def get_thread_count_delete(self) -> List[str]:
        return BASE + ["thread-count"]

    def get_lua_file(self, path: str) -> List[str]:
        return BASE + ["lua-file", path]

    def get_lua_file_delete(self) -> List[str]:
        return BASE + ["lua-file"]

    # ========================================================================
    # Log
    # ========================================================================

    def get_log_level(self, level: str) -> List[str]:
        return BASE + ["log", "level", level]

    def get_log_level_delete(self) -> List[str]:
        return BASE + ["log", "level"]

    # ========================================================================
    # Shaper
    # ========================================================================

    def get_shaper_fwmark(self, value: str) -> List[str]:
        return BASE + ["shaper", "fwmark", value]

    def get_shaper_fwmark_delete(self) -> List[str]:
        return BASE + ["shaper", "fwmark"]

    def get_shaper_delete(self) -> List[str]:
        return BASE + ["shaper"]

    # ========================================================================
    # SNMP
    # ========================================================================

    def get_snmp_master_agent(self) -> List[str]:
        return BASE + ["snmp", "master-agent"]

    def get_snmp_delete(self) -> List[str]:
        return BASE + ["snmp"]

    # ========================================================================
    # Extended scripts
    # ========================================================================

    def get_extended_scripts_on_change(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-change", script]

    def get_extended_scripts_on_change_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-change"]

    def get_extended_scripts_on_down(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-down", script]

    def get_extended_scripts_on_down_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-down"]

    def get_extended_scripts_on_pre_up(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-pre-up", script]

    def get_extended_scripts_on_pre_up_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-pre-up"]

    def get_extended_scripts_on_up(self, script: str) -> List[str]:
        return BASE + ["extended-scripts", "on-up", script]

    def get_extended_scripts_on_up_delete(self) -> List[str]:
        return BASE + ["extended-scripts", "on-up"]

    # ========================================================================
    # Limits
    # ========================================================================

    def get_limits_burst(self, value: str) -> List[str]:
        return BASE + ["limits", "burst", value]

    def get_limits_burst_delete(self) -> List[str]:
        return BASE + ["limits", "burst"]

    def get_limits_connection_limit(self, value: str) -> List[str]:
        return BASE + ["limits", "connection-limit", value]

    def get_limits_connection_limit_delete(self) -> List[str]:
        return BASE + ["limits", "connection-limit"]

    def get_limits_timeout(self, value: str) -> List[str]:
        return BASE + ["limits", "timeout", value]

    def get_limits_timeout_delete(self) -> List[str]:
        return BASE + ["limits", "timeout"]

    def get_limits_delete(self) -> List[str]:
        return BASE + ["limits"]

    # ========================================================================
    # Authentication - mode
    # ========================================================================

    def get_auth_mode(self, mode: str) -> List[str]:
        return BASE + ["authentication", "mode", mode]

    def get_auth_mode_delete(self) -> List[str]:
        return BASE + ["authentication", "mode"]

    # ========================================================================
    # Authentication - local (interface/MAC static mappings)
    # ========================================================================

    def get_auth_interface_mac(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac]

    def get_auth_interface_mac_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac]

    def get_auth_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["authentication", "interface", iface]

    def get_auth_mac_ip_address(self, iface: str, mac: str, ip: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "ip-address", ip]

    def get_auth_mac_ip_address_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "ip-address"]

    def get_auth_mac_vlan(self, iface: str, mac: str, vlan: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "vlan", vlan]

    def get_auth_mac_vlan_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "vlan"]

    def get_auth_mac_rate_limit_download(self, iface: str, mac: str, value: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "download", value]

    def get_auth_mac_rate_limit_download_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "download"]

    def get_auth_mac_rate_limit_upload(self, iface: str, mac: str, value: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "upload", value]

    def get_auth_mac_rate_limit_upload_delete(self, iface: str, mac: str) -> List[str]:
        return BASE + ["authentication", "interface", iface, "mac", mac, "rate-limit", "upload"]

    # ========================================================================
    # Authentication - RADIUS servers
    # ========================================================================

    def get_radius_server(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server]

    def get_radius_server_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server]

    def get_radius_server_key(self, server: str, key: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "key", key]

    def get_radius_server_port(self, server: str, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "port", port]

    def get_radius_server_port_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "port"]

    def get_radius_server_acct_port(self, server: str, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "acct-port", port]

    def get_radius_server_acct_port_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "acct-port"]

    def get_radius_server_priority(self, server: str, priority: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "priority", priority]

    def get_radius_server_priority_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "priority"]

    def get_radius_server_fail_time(self, server: str, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "fail-time", value]

    def get_radius_server_fail_time_delete(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "fail-time"]

    def get_radius_server_disable(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "disable"]

    def get_radius_server_backup(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "backup"]

    def get_radius_server_disable_accounting(self, server: str) -> List[str]:
        return BASE + ["authentication", "radius", "server", server, "disable-accounting"]

    def get_radius_source_address(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "source-address", address]

    def get_radius_source_address_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "source-address"]

    def get_radius_timeout(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "timeout", value]

    def get_radius_timeout_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "timeout"]

    def get_radius_max_try(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "max-try", value]

    def get_radius_max_try_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "max-try"]

    def get_radius_nas_identifier(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "nas-identifier", value]

    def get_radius_nas_identifier_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "nas-identifier"]

    def get_radius_nas_ip_address(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "nas-ip-address", address]

    def get_radius_nas_ip_address_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "nas-ip-address"]

    def get_radius_accounting_interim_interval(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "accounting-interim-interval", value]

    def get_radius_accounting_interim_interval_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "accounting-interim-interval"]

    def get_radius_acct_interim_jitter(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "acct-interim-jitter", value]

    def get_radius_acct_interim_jitter_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "acct-interim-jitter"]

    def get_radius_acct_timeout(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "acct-timeout", value]

    def get_radius_acct_timeout_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "acct-timeout"]

    def get_radius_preallocate_vif(self) -> List[str]:
        return BASE + ["authentication", "radius", "preallocate-vif"]

    def get_radius_dynamic_author_server(self, address: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "server", address]

    def get_radius_dynamic_author_server_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "server"]

    def get_radius_dynamic_author_port(self, port: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "port", port]

    def get_radius_dynamic_author_port_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "port"]

    def get_radius_dynamic_author_key(self, key: str) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "key", key]

    def get_radius_dynamic_author_key_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "dynamic-author", "key"]

    def get_radius_rate_limit_enable(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "enable"]

    def get_radius_rate_limit_attribute(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "attribute", value]

    def get_radius_rate_limit_attribute_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "attribute"]

    def get_radius_rate_limit_vendor(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "vendor", value]

    def get_radius_rate_limit_vendor_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "vendor"]

    def get_radius_rate_limit_multiplier(self, value: str) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "multiplier", value]

    def get_radius_rate_limit_multiplier_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit", "multiplier"]

    def get_radius_rate_limit_delete(self) -> List[str]:
        return BASE + ["authentication", "radius", "rate-limit"]

    # ========================================================================
    # Client IP pools
    # ========================================================================

    def get_pool(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name]

    def get_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name]

    def get_pool_range(self, name: str, cidr: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "range", cidr]

    def get_pool_range_delete(self, name: str, cidr: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "range", cidr]

    def get_pool_next_pool(self, name: str, next_name: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "next-pool", next_name]

    def get_pool_next_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ip-pool", name, "next-pool"]

    # ========================================================================
    # Client IPv6 pools
    # ========================================================================

    def get_ipv6_pool(self, name: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name]

    def get_ipv6_pool_delete(self, name: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name]

    def get_ipv6_pool_prefix(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix]

    def get_ipv6_pool_prefix_mask(self, name: str, prefix: str, mask: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix, "mask", mask]

    def get_ipv6_pool_prefix_mask_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix, "mask"]

    def get_ipv6_pool_prefix_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "prefix", prefix]

    def get_ipv6_pool_delegate(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix]

    def get_ipv6_pool_delegate_prefix_len(self, name: str, prefix: str, length: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix, "delegation-prefix", length]

    def get_ipv6_pool_delegate_prefix_len_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix, "delegation-prefix"]

    def get_ipv6_pool_delegate_delete(self, name: str, prefix: str) -> List[str]:
        return BASE + ["client-ipv6-pool", name, "delegate", prefix]

    # ========================================================================
    # Interfaces
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    def get_interface_mode(self, iface: str, mode: str) -> List[str]:
        return BASE + ["interface", iface, "mode", mode]

    def get_interface_mode_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "mode"]

    def get_interface_network(self, iface: str, network: str) -> List[str]:
        return BASE + ["interface", iface, "network", network]

    def get_interface_network_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "network"]

    def get_interface_start_session(self, iface: str, value: str) -> List[str]:
        return BASE + ["interface", iface, "start-session", value]

    def get_interface_start_session_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "start-session"]

    def get_interface_client_subnet(self, iface: str, subnet: str) -> List[str]:
        return BASE + ["interface", iface, "client-subnet", subnet]

    def get_interface_client_subnet_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "client-subnet"]

    def get_interface_vlan(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_delete(self, iface: str, vlan: str) -> List[str]:
        return BASE + ["interface", iface, "vlan", vlan]

    def get_interface_vlan_all_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan"]

    def get_interface_vlan_mon(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan-mon"]

    def get_interface_lua_username(self, iface: str, func: str) -> List[str]:
        return BASE + ["interface", iface, "lua-username", func]

    def get_interface_lua_username_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "lua-username"]

    def get_interface_external_dhcp_relay(self, iface: str, address: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "dhcp-relay", address]

    def get_interface_external_dhcp_relay_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "dhcp-relay"]

    def get_interface_external_dhcp_giaddr(self, iface: str, address: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "giaddr", address]

    def get_interface_external_dhcp_giaddr_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp", "giaddr"]

    def get_interface_external_dhcp_delete(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "external-dhcp"]

    # ========================================================================
    # Full delete
    # ========================================================================

    def get_ipoe_server_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Config parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        cfg = full_config.get("service", {}).get("ipoe-server", {})
        if not cfg:
            return {
                "configured": False,
                "description": None,
                "default_pool": None,
                "default_ipv6_pool": None,
                "gateway_addresses": [],
                "name_servers": [],
                "max_concurrent_sessions": None,
                "thread_count": None,
                "lua_file": None,
                "log": {},
                "shaper": {},
                "snmp": {},
                "extended_scripts": {},
                "limits": {},
                "authentication": {},
                "client_ip_pools": {},
                "client_ipv6_pools": {},
                "interfaces": {},
            }

        return {
            "configured": True,
            "description": cfg.get("description"),
            "default_pool": cfg.get("default-pool"),
            "default_ipv6_pool": cfg.get("default-ipv6-pool"),
            "gateway_addresses": self._normalize_to_list(cfg.get("gateway-address")),
            "name_servers": self._normalize_to_list(cfg.get("name-server")),
            "max_concurrent_sessions": cfg.get("max-concurrent-sessions"),
            "thread_count": cfg.get("thread-count"),
            "lua_file": cfg.get("lua-file"),
            "log": self._parse_log(cfg.get("log", {})),
            "shaper": self._parse_shaper(cfg.get("shaper", {})),
            "snmp": self._parse_snmp(cfg.get("snmp", {})),
            "extended_scripts": self._parse_extended_scripts(cfg.get("extended-scripts", {})),
            "limits": self._parse_limits(cfg.get("limits", {})),
            "authentication": self._parse_authentication(cfg.get("authentication", {})),
            "client_ip_pools": self._parse_client_ip_pools(cfg.get("client-ip-pool", {})),
            "client_ipv6_pools": self._parse_client_ipv6_pools(cfg.get("client-ipv6-pool", {})),
            "interfaces": self._parse_interfaces(cfg.get("interface", {})),
        }

    def _normalize_to_list(self, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _parse_log(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"level": cfg.get("level")}

    def _parse_shaper(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"fwmark": cfg.get("fwmark")}

    def _parse_snmp(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {"master_agent": "master-agent" in cfg}

    def _parse_extended_scripts(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "on_change": cfg.get("on-change"),
            "on_down": cfg.get("on-down"),
            "on_pre_up": cfg.get("on-pre-up"),
            "on_up": cfg.get("on-up"),
        }

    def _parse_limits(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "burst": cfg.get("burst"),
            "connection_limit": cfg.get("connection-limit"),
            "timeout": cfg.get("timeout"),
        }

    def _parse_authentication(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "mode": cfg.get("mode"),
            "interfaces": self._parse_auth_interfaces(cfg.get("interface", {})),
            "radius": self._parse_radius(cfg.get("radius", {})),
        }

    def _parse_auth_interfaces(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        result = {}
        for iface, iface_cfg in cfg.items():
            macs = {}
            for mac, mac_cfg in iface_cfg.get("mac", {}).items():
                rate_limit = mac_cfg.get("rate-limit", {})
                macs[mac] = {
                    "mac": mac,
                    "ip_address": mac_cfg.get("ip-address"),
                    "vlan": mac_cfg.get("vlan"),
                    "rate_limit": {
                        "download": rate_limit.get("download"),
                        "upload": rate_limit.get("upload"),
                    },
                }
            result[iface] = {"interface": iface, "macs": macs}
        return result

    def _parse_radius(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        servers = {}
        for addr, srv_cfg in cfg.get("server", {}).items():
            servers[addr] = {
                "address": addr,
                "key": "***" if srv_cfg.get("key") else None,
                "port": srv_cfg.get("port"),
                "acct_port": srv_cfg.get("acct-port"),
                "priority": srv_cfg.get("priority"),
                "fail_time": srv_cfg.get("fail-time"),
                "disabled": "disable" in srv_cfg,
                "backup": "backup" in srv_cfg,
                "disable_accounting": "disable-accounting" in srv_cfg,
            }

        dae = cfg.get("dynamic-author", {})
        rate_limit = cfg.get("rate-limit", {})

        return {
            "servers": servers,
            "source_address": cfg.get("source-address"),
            "timeout": cfg.get("timeout"),
            "max_try": cfg.get("max-try"),
            "nas_identifier": cfg.get("nas-identifier"),
            "nas_ip_address": cfg.get("nas-ip-address"),
            "accounting_interim_interval": cfg.get("accounting-interim-interval"),
            "acct_interim_jitter": cfg.get("acct-interim-jitter"),
            "acct_timeout": cfg.get("acct-timeout"),
            "preallocate_vif": "preallocate-vif" in cfg,
            "dynamic_author": {
                "server": dae.get("server"),
                "port": dae.get("port"),
                "key": "***" if dae.get("key") else None,
            },
            "rate_limit": {
                "enable": "enable" in rate_limit,
                "attribute": rate_limit.get("attribute"),
                "vendor": rate_limit.get("vendor"),
                "multiplier": rate_limit.get("multiplier"),
            },
        }

    def _parse_client_ip_pools(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_cfg in cfg.items():
            pools[name] = {
                "name": name,
                "ranges": self._normalize_to_list(pool_cfg.get("range")),
                "next_pool": pool_cfg.get("next-pool"),
            }
        return pools

    def _parse_client_ipv6_pools(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        pools = {}
        for name, pool_cfg in cfg.items():
            prefixes = {}
            for prefix, pfx_cfg in pool_cfg.get("prefix", {}).items():
                prefixes[prefix] = {
                    "prefix": prefix,
                    "mask": pfx_cfg.get("mask"),
                }
            delegates = {}
            for prefix, del_cfg in pool_cfg.get("delegate", {}).items():
                delegates[prefix] = {
                    "prefix": prefix,
                    "delegation_prefix": del_cfg.get("delegation-prefix"),
                }
            pools[name] = {
                "name": name,
                "prefixes": prefixes,
                "delegates": delegates,
            }
        return pools

    def _parse_interfaces(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        interfaces = {}
        for iface, iface_cfg in cfg.items():
            ext_dhcp = iface_cfg.get("external-dhcp", {})
            interfaces[iface] = {
                "interface": iface,
                "mode": iface_cfg.get("mode"),
                "network": iface_cfg.get("network"),
                "start_session": iface_cfg.get("start-session"),
                "client_subnet": iface_cfg.get("client-subnet"),
                "vlans": self._normalize_to_list(iface_cfg.get("vlan")),
                "vlan_mon": "vlan-mon" in iface_cfg,
                "lua_username": iface_cfg.get("lua-username"),
                "external_dhcp": {
                    "dhcp_relay": ext_dhcp.get("dhcp-relay"),
                    "giaddr": ext_dhcp.get("giaddr"),
                } if ext_dhcp else None,
            }
        return interfaces
