"""IPoE Server Batch Builder.

Batch operations for ``service ipoe-server``. The batch router binds the first
parameter to ``item_name`` (an interface, a pool name, a RADIUS server, or a
placeholder for global settings) and splits ``value`` on ``|`` for the rest.
"""

from typing import Any, Dict, List, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ipoe_server.ipoe_server import IPoEServerMapper


class IPoEServerBatchBuilder(BatchBuilder):
    """Batch builder for all IPoE server configuration operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "ipoe_server"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    # ========================================================================
    # Core infrastructure
    # ========================================================================

    def _m(self) -> IPoEServerMapper:
        return cast(IPoEServerMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a leaf only one VyOS version has; ValueError elsewhere."""
        mapper = self._m()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    def get_capabilities(self) -> Dict[str, Any]:
        """Feature flags and value lists, read from the mapper allowlist."""
        m = self._m()
        nodes = m.versioned_nodes()
        return {
            "version": self.version,
            "features": {
                "auth_local": True,
                "auth_radius": True,
                "auth_noauth": True,
                "client_ip_pools": True,
                "client_ipv6_pools": True,
                "interfaces": True,
                "vlan_mon": "vlan_mon" in nodes,
                "idle_timeout": "idle_timeout" in nodes,
                "extended_scripts": True,
                "shaper": True,
                "snmp": True,
                "limits": True,
                "lua_support": True,
            },
            "values": {
                "auth_modes": m.auth_modes(),
                "interface_modes": m.interface_modes(),
                "interface_networks": m.interface_networks(),
                "start_session": m.start_session_values(),
                "log_levels": m.log_levels(),
            },
        }

    # ========================================================================
    # Global settings
    # ========================================================================

    def set_description(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_description(value))

    def delete_description(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_description_delete())

    def set_default_pool(self, _unused: str, name: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_default_pool(name))

    def delete_default_pool(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_default_pool_delete())

    def set_default_ipv6_pool(self, _unused: str, name: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_default_ipv6_pool(name))

    def delete_default_ipv6_pool(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_default_ipv6_pool_delete())

    def set_gateway_address(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_gateway_address(address))

    def delete_gateway_address(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_gateway_address_delete(address))

    def delete_all_gateway_addresses(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_gateway_address_all_delete())

    def set_name_server(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_name_server(address))

    def delete_name_server(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_name_server_delete(address))

    def set_max_concurrent_sessions(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_max_concurrent_sessions(value))

    def delete_max_concurrent_sessions(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_max_concurrent_sessions_delete())

    def set_thread_count(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_thread_count(value))

    def delete_thread_count(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_thread_count_delete())

    def set_lua_file(self, _unused: str, path: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_lua_file(path))

    def delete_lua_file(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_lua_file_delete())

    def set_idle_timeout(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        """Set the idle session timeout (VyOS 1.5 only)."""
        return self.add_set(self._versioned_path("idle_timeout", "get_idle_timeout", value))

    def delete_idle_timeout(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Delete the idle session timeout (VyOS 1.5 only)."""
        return self.add_delete(self._versioned_path("idle_timeout", "get_idle_timeout_delete"))

    def delete_ipoe_server(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_ipoe_server_delete())

    # ========================================================================
    # Log
    # ========================================================================

    def set_log_level(self, _unused: str, level: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_log_level(level))

    def delete_log_level(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Delete ``log``: level is its only child, and a leaf delete leaves ``log {}``."""
        return self.add_delete(self._m().get_log_delete())

    # ========================================================================
    # Shaper
    # ========================================================================

    def set_shaper(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Turn the shaper on without a fwmark (a bare node commits)."""
        return self.add_set(self._m().get_shaper())

    def delete_shaper(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_shaper())

    def set_shaper_fwmark(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_shaper_fwmark(value))

    def delete_shaper_fwmark(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_shaper_fwmark_delete())

    # ========================================================================
    # SNMP
    # ========================================================================

    def set_snmp(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Turn SNMP on without the master agent (a bare node commits)."""
        return self.add_set(self._m().get_snmp())

    def delete_snmp(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_snmp())

    def set_snmp_master_agent(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_snmp_master_agent())

    def delete_snmp_master_agent(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_snmp_master_agent())

    # ========================================================================
    # Extended scripts
    # ========================================================================

    def delete_extended_scripts(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Drop the node; an empty ``extended-scripts`` still loads pppd_compat."""
        return self.add_delete(self._m().get_extended_scripts())

    def set_script_on_change(self, _unused: str, script: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_extended_scripts_on_change(script))

    def delete_script_on_change(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_extended_scripts_on_change_delete())

    def set_script_on_down(self, _unused: str, script: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_extended_scripts_on_down(script))

    def delete_script_on_down(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_extended_scripts_on_down_delete())

    def set_script_on_pre_up(self, _unused: str, script: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_extended_scripts_on_pre_up(script))

    def delete_script_on_pre_up(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_extended_scripts_on_pre_up_delete())

    def set_script_on_up(self, _unused: str, script: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_extended_scripts_on_up(script))

    def delete_script_on_up(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_extended_scripts_on_up_delete())

    # ========================================================================
    # Limits
    # ========================================================================

    def set_limits(self, _unused: str) -> "IPoEServerBatchBuilder":
        """Turn connection limits on with defaults (a bare node commits)."""
        return self.add_set(self._m().get_limits())

    def delete_limits(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_limits())

    def set_limits_burst(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_limits_burst(value))

    def delete_limits_burst(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_limits_burst_delete())

    def set_limits_connection_limit(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_limits_connection_limit(value))

    def delete_limits_connection_limit(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_limits_connection_limit_delete())

    def set_limits_timeout(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_limits_timeout(value))

    def delete_limits_timeout(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_limits_timeout_delete())

    # ========================================================================
    # Authentication - mode
    # ========================================================================

    def set_auth_mode(self, _unused: str, mode: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_mode(mode))

    def delete_auth_mode(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mode_delete())

    # ========================================================================
    # Authentication - local interface/MAC mappings
    # item_name = interface name, value = "mac" or "mac|<leaf value>"
    # ========================================================================

    def set_auth_interface_mac(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_interface_mac(iface, mac))

    def delete_auth_interface_mac(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_interface_mac_delete(iface, mac))

    def delete_auth_interface(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_interface_delete(iface))

    def set_auth_mac_ip_address(self, iface: str, mac: str, ip: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_mac_ip_address(iface, mac, ip))

    def delete_auth_mac_ip_address(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mac_ip_address_delete(iface, mac))

    def set_auth_mac_vlan(self, iface: str, mac: str, vlan: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_mac_vlan(iface, mac, vlan))

    def delete_auth_mac_vlan(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mac_vlan_delete(iface, mac))

    def set_auth_mac_rate_limit_download(self, iface: str, mac: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_mac_rate_limit_download(iface, mac, value))

    def delete_auth_mac_rate_limit_download(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mac_rate_limit_download_delete(iface, mac))

    def set_auth_mac_rate_limit_upload(self, iface: str, mac: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_auth_mac_rate_limit_upload(iface, mac, value))

    def delete_auth_mac_rate_limit_upload(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mac_rate_limit_upload_delete(iface, mac))

    def delete_auth_mac_rate_limit(self, iface: str, mac: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_auth_mac_rate_limit_delete(iface, mac))

    # ========================================================================
    # Authentication - RADIUS servers
    # item_name = RADIUS server IP
    # ========================================================================

    def set_radius_server(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server(server))

    def delete_radius_server(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_delete(server))

    def set_radius_server_key(self, server: str, key: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_key(server, key))

    def set_radius_server_port(self, server: str, port: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_port(server, port))

    def delete_radius_server_port(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_port_delete(server))

    def set_radius_server_acct_port(self, server: str, port: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_acct_port(server, port))

    def delete_radius_server_acct_port(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_acct_port_delete(server))

    def set_radius_server_priority(self, server: str, priority: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_priority(server, priority))

    def delete_radius_server_priority(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_priority_delete(server))

    def set_radius_server_fail_time(self, server: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_fail_time(server, value))

    def delete_radius_server_fail_time(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_fail_time_delete(server))

    def set_radius_server_disable(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_disable(server))

    def delete_radius_server_disable(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_disable(server))

    def set_radius_server_backup(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_backup(server))

    def delete_radius_server_backup(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_backup(server))

    def set_radius_server_disable_accounting(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_server_disable_accounting(server))

    def delete_radius_server_disable_accounting(self, server: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_server_disable_accounting(server))

    # ========================================================================
    # Authentication - RADIUS global settings
    # item_name = unused placeholder ("ipoe")
    # ========================================================================

    def set_radius_source_address(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_source_address(address))

    def delete_radius_source_address(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_source_address_delete())

    def set_radius_timeout(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_timeout(value))

    def delete_radius_timeout(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_timeout_delete())

    def set_radius_max_try(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_max_try(value))

    def delete_radius_max_try(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_max_try_delete())

    def set_radius_nas_identifier(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_nas_identifier(value))

    def delete_radius_nas_identifier(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_nas_identifier_delete())

    def set_radius_nas_ip_address(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_nas_ip_address(address))

    def delete_radius_nas_ip_address(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_nas_ip_address_delete())

    def set_radius_accounting_interim_interval(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_accounting_interim_interval(value))

    def delete_radius_accounting_interim_interval(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_accounting_interim_interval_delete())

    def set_radius_acct_interim_jitter(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_acct_interim_jitter(value))

    def delete_radius_acct_interim_jitter(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_acct_interim_jitter_delete())

    def set_radius_acct_timeout(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_acct_timeout(value))

    def delete_radius_acct_timeout(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_acct_timeout_delete())

    def set_radius_preallocate_vif(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_preallocate_vif())

    def delete_radius_preallocate_vif(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_preallocate_vif())

    def set_radius_dynamic_author_server(self, _unused: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_dynamic_author_server(address))

    def delete_radius_dynamic_author_server(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_dynamic_author_server_delete())

    def set_radius_dynamic_author_port(self, _unused: str, port: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_dynamic_author_port(port))

    def delete_radius_dynamic_author_port(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_dynamic_author_port_delete())

    def set_radius_dynamic_author_key(self, _unused: str, key: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_dynamic_author_key(key))

    def delete_radius_dynamic_author_key(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_dynamic_author_key_delete())

    def delete_radius_dynamic_author(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_dynamic_author_delete())

    def set_radius_rate_limit_enable(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_rate_limit_enable())

    def delete_radius_rate_limit_enable(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_rate_limit_enable())

    def delete_radius_rate_limit(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_rate_limit_delete())

    def set_radius_rate_limit_attribute(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_rate_limit_attribute(value))

    def delete_radius_rate_limit_attribute(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_rate_limit_attribute_delete())

    def set_radius_rate_limit_vendor(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_rate_limit_vendor(value))

    def delete_radius_rate_limit_vendor(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_rate_limit_vendor_delete())

    def set_radius_rate_limit_multiplier(self, _unused: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_radius_rate_limit_multiplier(value))

    def delete_radius_rate_limit_multiplier(self, _unused: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_radius_rate_limit_multiplier_delete())

    # ========================================================================
    # Client IP pools
    # item_name = pool name
    # ========================================================================

    def create_pool(self, name: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_pool(name))

    def delete_pool(self, name: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_pool_delete(name))

    def set_pool_range(self, name: str, cidr: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_pool_range(name, cidr))

    def delete_pool_range(self, name: str, cidr: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_pool_range_delete(name, cidr))

    def set_pool_next_pool(self, name: str, next_name: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_pool_next_pool(name, next_name))

    def delete_pool_next_pool(self, name: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_pool_next_pool_delete(name))

    # ========================================================================
    # Client IPv6 pools
    # item_name = pool name
    # ========================================================================

    def create_ipv6_pool(self, name: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_ipv6_pool(name))

    def delete_ipv6_pool(self, name: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_ipv6_pool_delete(name))

    def set_ipv6_pool_prefix(self, name: str, prefix: str) -> "IPoEServerBatchBuilder":
        """Prefix on the default mask (64)."""
        return self.add_set(self._m().get_ipv6_pool_prefix(name, prefix))

    def set_ipv6_pool_prefix_mask(self, name: str, prefix: str, mask: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_ipv6_pool_prefix_mask(name, prefix, mask))

    def delete_ipv6_pool_prefix_mask(self, name: str, prefix: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_ipv6_pool_prefix_mask_delete(name, prefix))

    def delete_ipv6_pool_prefix(self, name: str, prefix: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_ipv6_pool_prefix_delete(name, prefix))

    def set_ipv6_pool_delegate(self, name: str, prefix: str, length: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_ipv6_pool_delegate_prefix_len(name, prefix, length))

    def delete_ipv6_pool_delegate(self, name: str, prefix: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_ipv6_pool_delegate_delete(name, prefix))

    # ========================================================================
    # Interfaces
    # item_name = interface name
    # ========================================================================

    def create_interface(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface(iface))

    def delete_interface(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_delete(iface))

    def set_interface_mode(self, iface: str, mode: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_mode(iface, mode))

    def delete_interface_mode(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_mode_delete(iface))

    def set_interface_network(self, iface: str, network: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_network(iface, network))

    def delete_interface_network(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_network_delete(iface))

    def set_interface_start_session(self, iface: str, value: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_start_session(iface, value))

    def delete_interface_start_session(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_start_session_delete(iface))

    def set_interface_client_subnet(self, iface: str, subnet: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_client_subnet(iface, subnet))

    def delete_interface_client_subnet(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_client_subnet_delete(iface))

    def set_interface_vlan(self, iface: str, vlan: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_vlan(iface, vlan))

    def delete_interface_vlan(self, iface: str, vlan: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_vlan_delete(iface, vlan))

    def delete_interface_all_vlans(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_vlan_all_delete(iface))

    def set_interface_vlan_mon(self, iface: str) -> "IPoEServerBatchBuilder":
        """Create VLAN interfaces automatically (VyOS 1.5 only)."""
        return self.add_set(self._versioned_path("vlan_mon", "get_interface_vlan_mon", iface))

    def delete_interface_vlan_mon(self, iface: str) -> "IPoEServerBatchBuilder":
        """Stop creating VLAN interfaces automatically (VyOS 1.5 only)."""
        return self.add_delete(self._versioned_path("vlan_mon", "get_interface_vlan_mon", iface))

    def set_interface_lua_username(self, iface: str, func: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_lua_username(iface, func))

    def delete_interface_lua_username(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_lua_username_delete(iface))

    def set_interface_external_dhcp_relay(self, iface: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_external_dhcp_relay(iface, address))

    def delete_interface_external_dhcp_relay(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_external_dhcp_relay_delete(iface))

    def set_interface_external_dhcp_giaddr(self, iface: str, address: str) -> "IPoEServerBatchBuilder":
        return self.add_set(self._m().get_interface_external_dhcp_giaddr(iface, address))

    def delete_interface_external_dhcp_giaddr(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_external_dhcp_giaddr_delete(iface))

    def delete_interface_external_dhcp(self, iface: str) -> "IPoEServerBatchBuilder":
        return self.add_delete(self._m().get_interface_external_dhcp_delete(iface))
