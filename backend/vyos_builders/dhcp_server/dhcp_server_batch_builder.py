"""
DHCP Server Batch Builder

Provides all DHCP batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import Any, Dict, List, Sequence, Tuple, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.dhcp_server.dhcp_server import DHCPServerMapper
from vyos_mappers.dhcp_server.dhcp_server_catalog import leaf_for
from vyos_builders.base import BatchBuilder


class DHCPServerBatchBuilder(BatchBuilder):
    """Complete batch builder for DHCP server operations"""

    def __init__(self, version: str):
        """Initialize DHCP batch builder."""
        super().__init__(version)

        self.mapper_key = "dhcp_server"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> DHCPServerMapper:
        return cast(DHCPServerMapper, self.mappers[self.mapper_key])

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a leaf only one VyOS version has; ValueError elsewhere."""
        mapper = self._mapper()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Global DHCP Server Operations
    # ========================================================================

    def set_global_disable(self) -> "DHCPServerBatchBuilder":
        """Disable the global DHCP server."""
        path = self.mappers[self.mapper_key].get_global_disable()
        return self.add_set(path)

    def delete_global_disable(self) -> "DHCPServerBatchBuilder":
        """Enable the global DHCP server."""
        path = self.mappers[self.mapper_key].get_global_disable_path()
        return self.add_delete(path)

    def set_listen_address(self, address: str) -> "DHCPServerBatchBuilder":
        """Set DHCP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "DHCPServerBatchBuilder":
        """Delete DHCP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    def set_hostfile_update(self) -> "DHCPServerBatchBuilder":
        """Enable hostfile-update."""
        path = self.mappers[self.mapper_key].get_hostfile_update()
        return self.add_set(path)

    def delete_hostfile_update(self) -> "DHCPServerBatchBuilder":
        """Disable hostfile-update."""
        path = self.mappers[self.mapper_key].get_hostfile_update_path()
        return self.add_delete(path)

    def set_host_decl_name(self) -> "DHCPServerBatchBuilder":
        """Enable host-decl-name."""
        path = self._versioned_path("host-decl-name", "get_host_decl_name")
        return self.add_set(path)

    def delete_host_decl_name(self) -> "DHCPServerBatchBuilder":
        """Disable host-decl-name."""
        path = self._versioned_path("host-decl-name", "get_host_decl_name_path")
        return self.add_delete(path)

    def set_listen_interface(self, interface: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path("listen-interface", "get_listen_interface", interface)
        return self.add_set(path)

    def delete_listen_interface(self, interface: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path("listen-interface", "get_listen_interface_path", interface)
        return self.add_delete(path)

    # ========================================================================
    # Shared Network Operations
    # ========================================================================

    def set_shared_network(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Create shared network."""
        path = self.mappers[self.mapper_key].get_shared_network(network_name)
        return self.add_set(path)

    def delete_shared_network(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Delete shared network."""
        path = self.mappers[self.mapper_key].get_shared_network_path(network_name)
        return self.add_delete(path)

    def set_shared_network_authoritative(
        self, network_name: str
    ) -> "DHCPServerBatchBuilder":
        """Set shared network authoritative."""
        path = self.mappers[self.mapper_key].get_shared_network_authoritative(
            network_name
        )
        return self.add_set(path)

    def delete_shared_network_authoritative(
        self, network_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete shared network authoritative."""
        path = self.mappers[self.mapper_key].get_shared_network_authoritative_path(
            network_name
        )
        return self.add_delete(path)

    def set_shared_network_name_server(
        self, network_name: str, name_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set shared network name-server."""
        path = self.mappers[self.mapper_key].get_shared_network_name_server(
            network_name, name_server
        )
        return self.add_set(path)

    def delete_shared_network_name_server(
        self, network_name: str, name_server: str
    ) -> "DHCPServerBatchBuilder":
        """Delete shared network name-server."""
        path = self.mappers[self.mapper_key].get_shared_network_name_server_path(
            network_name, name_server
        )
        return self.add_delete(path)

    def set_shared_network_domain_name(
        self, network_name: str, domain_name: str
    ) -> "DHCPServerBatchBuilder":
        """Set shared network domain-name."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_name(
            network_name, domain_name
        )
        return self.add_set(path)

    def delete_shared_network_domain_name(
        self, network_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete shared network domain-name."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_name_path(
            network_name
        )
        return self.add_delete(path)

    def set_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> "DHCPServerBatchBuilder":
        """Set shared network domain-search."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_search(
            network_name, domain_search
        )
        return self.add_set(path)

    def delete_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> "DHCPServerBatchBuilder":
        """Delete shared network domain-search."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_search_path(
            network_name, domain_search
        )
        return self.add_delete(path)

    def set_shared_network_ping_check(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Enable shared network ping-check."""
        path = self.mappers[self.mapper_key].get_shared_network_ping_check(
            network_name
        )
        return self.add_set(path)

    def delete_shared_network_ping_check(
        self, network_name: str
    ) -> "DHCPServerBatchBuilder":
        """Disable shared network ping-check."""
        path = self.mappers[self.mapper_key].get_shared_network_ping_check_path(
            network_name
        )
        return self.add_delete(path)

    def set_shared_network_disable(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Disable a shared network."""
        path = self.mappers[self.mapper_key].get_shared_network_disable(network_name)
        return self.add_set(path)

    def delete_shared_network_disable(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Enable a shared network."""
        path = self.mappers[self.mapper_key].get_shared_network_disable_path(network_name)
        return self.add_delete(path)

    def set_shared_network_description(
        self, network_name: str, description: str
    ) -> "DHCPServerBatchBuilder":
        """Set shared network description."""
        path = self.mappers[self.mapper_key].get_shared_network_description(
            network_name, description
        )
        return self.add_set(path)

    def delete_shared_network_description(self, network_name: str) -> "DHCPServerBatchBuilder":
        """Delete shared network description."""
        path = self.mappers[self.mapper_key].get_shared_network_description_path(network_name)
        return self.add_delete(path)

    # ========================================================================
    # Subnet Operations
    # ========================================================================

    def set_subnet(self, network_name: str, subnet: str) -> "DHCPServerBatchBuilder":
        """Create subnet."""
        path = self.mappers[self.mapper_key].get_subnet(network_name, subnet)
        return self.add_set(path)

    def delete_subnet(self, network_name: str, subnet: str) -> "DHCPServerBatchBuilder":
        """Delete subnet."""
        path = self.mappers[self.mapper_key].get_subnet_path(network_name, subnet)
        return self.add_delete(path)

    def set_subnet_subnet_id(
        self, network_name: str, subnet: str, subnet_id: int
    ) -> "DHCPServerBatchBuilder":
        """Set subnet-id (VyOS 1.5 only)."""
        path = self._versioned_path(
            "subnet-id", "get_subnet_subnet_id", network_name, subnet, subnet_id
        )
        return self.add_set(path)

    def set_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet default-router (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_default_router(
            network_name, subnet, router
        )
        return self.add_set(path)

    def delete_subnet_default_router(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet default-router."""
        path = self.mappers[self.mapper_key].get_subnet_default_router_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet name-server (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_name_server(
            network_name, subnet, name_server
        )
        return self.add_set(path)

    def delete_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet name-server."""
        path = self.mappers[self.mapper_key].get_subnet_name_server_path(
            network_name, subnet, name_server
        )
        return self.add_delete(path)

    def set_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet domain-name (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_domain_name(
            network_name, subnet, domain_name
        )
        return self.add_set(path)

    def delete_subnet_domain_name(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet domain-name."""
        path = self.mappers[self.mapper_key].get_subnet_domain_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_lease(
        self, network_name: str, subnet: str, lease: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet lease time."""
        path = self.mappers[self.mapper_key].get_subnet_lease(
            network_name, subnet, lease
        )
        return self.add_set(path)

    def delete_subnet_lease(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet lease."""
        path = self.mappers[self.mapper_key].get_subnet_lease_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet domain-search."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search(
            network_name, subnet, domain_search
        )
        return self.add_set(path)

    def delete_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet domain-search."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search_path(
            network_name, subnet, domain_search
        )
        return self.add_delete(path)

    def set_subnet_ping_check(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Enable subnet ping-check."""
        path = self.mappers[self.mapper_key].get_subnet_ping_check(
            network_name, subnet
        )
        return self.add_set(path)

    def delete_subnet_ping_check(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Disable subnet ping-check."""
        path = self.mappers[self.mapper_key].get_subnet_ping_check_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_disable(self, network_name: str, subnet: str) -> "DHCPServerBatchBuilder":
        """Disable a subnet."""
        path = self._versioned_path(
            "subnet disable", "get_subnet_disable", network_name, subnet
        )
        return self.add_set(path)

    def delete_subnet_disable(self, network_name: str, subnet: str) -> "DHCPServerBatchBuilder":
        """Enable a subnet."""
        path = self._versioned_path(
            "subnet disable", "get_subnet_disable_path", network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_description(
        self, network_name: str, subnet: str, description: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet description."""
        path = self.mappers[self.mapper_key].get_subnet_description(
            network_name, subnet, description
        )
        return self.add_set(path)

    def delete_subnet_description(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet description."""
        path = self.mappers[self.mapper_key].get_subnet_description_path(
            network_name, subnet
        )
        return self.add_delete(path)

    # ========================================================================
    # Range Operations
    # ========================================================================

    def set_subnet_range(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPServerBatchBuilder":
        """Create subnet range."""
        path = self.mappers[self.mapper_key].get_subnet_range(
            network_name, subnet, range_id
        )
        return self.add_set(path)

    def delete_subnet_range(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet range."""
        path = self.mappers[self.mapper_key].get_subnet_range_path(
            network_name, subnet, range_id
        )
        return self.add_delete(path)

    def set_subnet_range_start(
        self, network_name: str, subnet: str, range_id: str, start: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet range start address."""
        path = self.mappers[self.mapper_key].get_subnet_range_start(
            network_name, subnet, range_id, start
        )
        return self.add_set(path)

    def set_subnet_range_stop(
        self, network_name: str, subnet: str, range_id: str, stop: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet range stop address."""
        path = self.mappers[self.mapper_key].get_subnet_range_stop(
            network_name, subnet, range_id, stop
        )
        return self.add_set(path)

    # ========================================================================
    # Exclude Operations
    # ========================================================================

    def set_subnet_exclude(
        self, network_name: str, subnet: str, address: str
    ) -> "DHCPServerBatchBuilder":
        """Add subnet exclude address."""
        path = self.mappers[self.mapper_key].get_subnet_exclude(
            network_name, subnet, address
        )
        return self.add_set(path)

    def delete_subnet_exclude(
        self, network_name: str, subnet: str, address: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet exclude address."""
        path = self.mappers[self.mapper_key].get_subnet_exclude_path(
            network_name, subnet, address
        )
        return self.add_delete(path)

    # ========================================================================
    # Static Mapping Operations
    # ========================================================================

    def set_static_mapping(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Create static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping(
            network_name, subnet, mapping_name
        )
        return self.add_set(path)

    def delete_static_mapping(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_ip_address(
        self, network_name: str, subnet: str, mapping_name: str, ip_address: str
    ) -> "DHCPServerBatchBuilder":
        """Set static mapping IP address."""
        path = self.mappers[self.mapper_key].get_static_mapping_ip_address(
            network_name, subnet, mapping_name, ip_address
        )
        return self.add_set(path)

    def delete_static_mapping_ip_address(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete static mapping IP address."""
        path = self.mappers[self.mapper_key].get_static_mapping_ip_address_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_mac_address(
        self, network_name: str, subnet: str, mapping_name: str, mac_address: str
    ) -> "DHCPServerBatchBuilder":
        """Set static mapping MAC address."""
        path = self.mappers[self.mapper_key].get_static_mapping_mac_address(
            network_name, subnet, mapping_name, mac_address
        )
        return self.add_set(path)

    def delete_static_mapping_mac_address(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete static mapping MAC address."""
        path = self.mappers[self.mapper_key].get_static_mapping_mac_address_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_duid(
        self, network_name: str, subnet: str, mapping_name: str, duid: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "static-mapping duid", "get_static_mapping_duid",
            network_name, subnet, mapping_name, duid,
        )
        return self.add_set(path)

    def delete_static_mapping_duid(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "static-mapping duid", "get_static_mapping_duid_path",
            network_name, subnet, mapping_name,
        )
        return self.add_delete(path)

    def set_static_mapping_disable(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Disable static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_disable(
            network_name, subnet, mapping_name
        )
        return self.add_set(path)

    def delete_static_mapping_disable(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Enable static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_disable_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_description(
        self, network_name: str, subnet: str, mapping_name: str, description: str
    ) -> "DHCPServerBatchBuilder":
        """Set static mapping description."""
        path = self._versioned_path(
            "static-mapping description", "get_static_mapping_description",
            network_name, subnet, mapping_name, description,
        )
        return self.add_set(path)

    def delete_static_mapping_description(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPServerBatchBuilder":
        """Delete static mapping description."""
        path = self._versioned_path(
            "static-mapping description", "get_static_mapping_description_path",
            network_name, subnet, mapping_name,
        )
        return self.add_delete(path)

    # ========================================================================
    # Additional Subnet Options
    # ========================================================================

    def set_subnet_bootfile_name(
        self, network_name: str, subnet: str, bootfile: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet bootfile-name."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_name(
            network_name, subnet, bootfile
        )
        return self.add_set(path)

    def delete_subnet_bootfile_name(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet bootfile-name."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_bootfile_server(
        self, network_name: str, subnet: str, server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet bootfile-server."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_server(
            network_name, subnet, server
        )
        return self.add_set(path)

    def delete_subnet_bootfile_server(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet bootfile-server."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_server_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_tftp_server_name(
        self, network_name: str, subnet: str, tftp_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet tftp-server-name."""
        path = self.mappers[self.mapper_key].get_subnet_tftp_server_name(
            network_name, subnet, tftp_server
        )
        return self.add_set(path)

    def delete_subnet_tftp_server_name(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet tftp-server-name."""
        path = self.mappers[self.mapper_key].get_subnet_tftp_server_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet time-server."""
        path = self.mappers[self.mapper_key].get_subnet_time_server(
            network_name, subnet, time_server
        )
        return self.add_set(path)

    def delete_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet time-server."""
        path = self.mappers[self.mapper_key].get_subnet_time_server_path(
            network_name, subnet, time_server
        )
        return self.add_delete(path)

    def set_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet ntp-server."""
        path = self.mappers[self.mapper_key].get_subnet_ntp_server(
            network_name, subnet, ntp_server
        )
        return self.add_set(path)

    def delete_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet ntp-server."""
        path = self.mappers[self.mapper_key].get_subnet_ntp_server_path(
            network_name, subnet, ntp_server
        )
        return self.add_delete(path)

    def set_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet wins-server."""
        path = self.mappers[self.mapper_key].get_subnet_wins_server(
            network_name, subnet, wins_server
        )
        return self.add_set(path)

    def delete_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet wins-server."""
        path = self.mappers[self.mapper_key].get_subnet_wins_server_path(
            network_name, subnet, wins_server
        )
        return self.add_delete(path)

    def set_subnet_time_offset(
        self, network_name: str, subnet: str, offset: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet time-offset."""
        path = self.mappers[self.mapper_key].get_subnet_time_offset(
            network_name, subnet, offset
        )
        return self.add_set(path)

    def delete_subnet_time_offset(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet time-offset."""
        path = self.mappers[self.mapper_key].get_subnet_time_offset_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_client_prefix_length(
        self, network_name: str, subnet: str, prefix_length: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet client-prefix-length."""
        path = self.mappers[self.mapper_key].get_subnet_client_prefix_length(
            network_name, subnet, prefix_length
        )
        return self.add_set(path)

    def delete_subnet_client_prefix_length(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet client-prefix-length."""
        path = self.mappers[self.mapper_key].get_subnet_client_prefix_length_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_wpad_url(
        self, network_name: str, subnet: str, url: str
    ) -> "DHCPServerBatchBuilder":
        """Set subnet wpad-url."""
        path = self.mappers[self.mapper_key].get_subnet_wpad_url(
            network_name, subnet, url
        )
        return self.add_set(path)

    def delete_subnet_wpad_url(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Delete subnet wpad-url."""
        path = self.mappers[self.mapper_key].get_subnet_wpad_url_path(
            network_name, subnet
        )
        return self.add_delete(path)

    # ========================================================================
    # Failover/High Availability Operations
    # ========================================================================

    def set_subnet_enable_failover(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Enable subnet failover."""
        path = self._versioned_path(
            "subnet enable-failover", "get_subnet_enable_failover", network_name, subnet
        )
        return self.add_set(path)

    def delete_subnet_enable_failover(
        self, network_name: str, subnet: str
    ) -> "DHCPServerBatchBuilder":
        """Disable subnet failover."""
        path = self._versioned_path(
            "subnet enable-failover", "get_subnet_enable_failover_path", network_name, subnet
        )
        return self.add_delete(path)

    def set_failover_mode(self, mode: str) -> "DHCPServerBatchBuilder":
        """Set failover mode."""
        path = self.mappers[self.mapper_key].get_failover_mode(mode)
        return self.add_set(path)

    def delete_failover_mode(self) -> "DHCPServerBatchBuilder":
        """Delete failover mode."""
        path = self.mappers[self.mapper_key].get_failover_mode_path()
        return self.add_delete(path)

    def set_failover_name(self, name: str) -> "DHCPServerBatchBuilder":
        """Set failover name."""
        path = self.mappers[self.mapper_key].get_failover_name(name)
        return self.add_set(path)

    def delete_failover_name(self) -> "DHCPServerBatchBuilder":
        """Delete failover name."""
        path = self.mappers[self.mapper_key].get_failover_name_path()
        return self.add_delete(path)

    def set_failover_source_address(self, address: str) -> "DHCPServerBatchBuilder":
        """Set failover source-address."""
        path = self.mappers[self.mapper_key].get_failover_source_address(address)
        return self.add_set(path)

    def delete_failover_source_address(self) -> "DHCPServerBatchBuilder":
        """Delete failover source-address."""
        path = self.mappers[self.mapper_key].get_failover_source_address_path()
        return self.add_delete(path)

    def set_failover_remote(self, remote: str) -> "DHCPServerBatchBuilder":
        """Set failover remote."""
        path = self.mappers[self.mapper_key].get_failover_remote(remote)
        return self.add_set(path)

    def delete_failover_remote(self) -> "DHCPServerBatchBuilder":
        """Delete failover remote."""
        path = self.mappers[self.mapper_key].get_failover_remote_path()
        return self.add_delete(path)

    def set_failover_status(self, status: str) -> "DHCPServerBatchBuilder":
        """Set failover status."""
        path = self.mappers[self.mapper_key].get_failover_status(status)
        return self.add_set(path)

    def delete_failover_status(self) -> "DHCPServerBatchBuilder":
        """Delete failover status."""
        path = self.mappers[self.mapper_key].get_failover_status_path()
        return self.add_delete(path)

    def set_failover_certificate(self, name: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "high-availability certificate", "get_failover_certificate", name
        )
        return self.add_set(path)

    def delete_failover_certificate(self) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "high-availability certificate", "get_failover_certificate_path"
        )
        return self.add_delete(path)

    def set_failover_ca_certificate(self, name: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "high-availability ca-certificate", "get_failover_ca_certificate", name
        )
        return self.add_set(path)

    def delete_failover_ca_certificate(self) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "high-availability ca-certificate", "get_failover_ca_certificate_path"
        )
        return self.add_delete(path)

    def set_dynamic_dns_update(self) -> "DHCPServerBatchBuilder":
        path = self._versioned_path("dynamic-dns-update", "get_dynamic_dns_update")
        return self.add_set(path)

    def delete_dynamic_dns_update(self) -> "DHCPServerBatchBuilder":
        path = self.mappers[self.mapper_key].get_dynamic_dns_update_path()
        return self.add_delete(path)

    def set_ddns_send_updates(self, value: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "dynamic-dns-update send-updates", "get_ddns_send_updates", value
        )
        return self.add_set(path)

    def set_ddns_scalar(self, spec: str) -> "DHCPServerBatchBuilder":
        # Wire format is "<field>|<value>". Partition on the first separator so a
        # value that itself contains "|" (e.g. a hostname-char-set regex) is kept
        # intact instead of being truncated by the generic pipe splitter.
        field, sep, value = spec.partition("|")
        if not sep:
            raise ValueError("set_ddns_scalar requires '<field>|<value>'")
        path = self._versioned_path(
            f"dynamic-dns-update {field}", "get_ddns_scalar", field, value
        )
        return self.add_set(path)

    def delete_ddns_scalar(self, field: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {field}", "get_ddns_scalar_path", field
        )
        return self.add_delete(path)

    def delete_ddns_send_updates(self) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "dynamic-dns-update send-updates", "get_ddns_send_updates_path"
        )
        return self.add_delete(path)

    def set_ddns_tsig_key(self, name: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path("dynamic-dns-update tsig-key", "get_ddns_tsig_key", name)
        return self.add_set(path)

    def delete_ddns_tsig_key(self, name: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "dynamic-dns-update tsig-key", "get_ddns_tsig_key_path", name
        )
        return self.add_delete(path)

    def set_ddns_tsig_key_algorithm(self, name: str, algorithm: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "dynamic-dns-update tsig-key", "get_ddns_tsig_key_algorithm", name, algorithm
        )
        return self.add_set(path)

    def set_ddns_tsig_key_secret(self, name: str, secret: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            "dynamic-dns-update tsig-key", "get_ddns_tsig_key_secret", name, secret
        )
        return self.add_set(path)

    def set_ddns_domain(self, kind: str, domain: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain", kind, domain
        )
        return self.add_set(path)

    def delete_ddns_domain(self, kind: str, domain: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_path", kind, domain
        )
        return self.add_delete(path)

    def set_ddns_domain_key_name(self, kind: str, domain: str, key_name: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_key_name", kind, domain, key_name
        )
        return self.add_set(path)

    def delete_ddns_domain_key_name(self, kind: str, domain: str) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_key_name_path", kind, domain
        )
        return self.add_delete(path)

    def set_ddns_domain_dns_server_address(
        self, kind: str, domain: str, server_id: str, address: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_dns_server_address",
            kind, domain, server_id, address,
        )
        return self.add_set(path)

    def set_ddns_domain_dns_server_port(
        self, kind: str, domain: str, server_id: str, port: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_dns_server_port",
            kind, domain, server_id, port,
        )
        return self.add_set(path)

    def delete_ddns_domain_dns_server(
        self, kind: str, domain: str, server_id: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_dns_server_path",
            kind, domain, server_id,
        )
        return self.add_delete(path)

    def delete_ddns_domain_dns_server_port(
        self, kind: str, domain: str, server_id: str
    ) -> "DHCPServerBatchBuilder":
        path = self._versioned_path(
            f"dynamic-dns-update {kind}", "get_ddns_domain_dns_server_port_path",
            kind, domain, server_id,
        )
        return self.add_delete(path)

    def _catalog_values(self, spec: str, expect: int) -> Tuple[str, List[str]]:
        parts = str(spec).split("|")
        token = parts[0].strip()
        values = parts[1:]
        if not token:
            raise ValueError("DHCP option name is required")
        if len(values) != expect:
            raise ValueError(f"{token} has the wrong number of values")
        return token, values

    def _apply_catalog(
        self,
        scope: str,
        anchors: Sequence[str],
        spec: str,
        deleting: bool,
    ) -> "DHCPServerBatchBuilder":
        mapper = self._mapper()
        token = str(spec).split("|", 1)[0].strip()
        leaf_kind = leaf_for(token).kind
        if deleting:
            expect = 1 if leaf_kind in ("multi", "route") else 0
        else:
            expect = 2 if leaf_kind == "route" else (0 if leaf_kind == "flag" else 1)
        token, values = self._catalog_values(spec, expect)
        if deleting:
            path = mapper.catalog_delete(scope, token, anchors, values)
            return self.add_delete(path)
        path = mapper.catalog_set(scope, token, anchors, values)
        return self.add_set(path)

    def set_subnet_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("subnet", (network_name, subnet), spec, False)

    def delete_subnet_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("subnet", (network_name, subnet), spec, True)

    def set_network_catalog(self, network_name: str, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("shared-network", (network_name,), spec, False)

    def delete_network_catalog(self, network_name: str, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("shared-network", (network_name,), spec, True)

    def set_global_catalog(self, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("global", (), spec, False)

    def delete_global_catalog(self, spec: str) -> "DHCPServerBatchBuilder":
        return self._apply_catalog("global", (), spec, True)

    def set_range_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        range_id, rest = self._child_spec(spec)
        return self._apply_catalog("range", (network_name, subnet, range_id), rest, False)

    def delete_range_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        range_id, rest = self._child_spec(spec)
        return self._apply_catalog("range", (network_name, subnet, range_id), rest, True)

    def set_mapping_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        name, rest = self._child_spec(spec)
        return self._apply_catalog("static-mapping", (network_name, subnet, name), rest, False)

    def delete_mapping_catalog(self, network_name: str, subnet: str, spec: str) -> "DHCPServerBatchBuilder":
        name, rest = self._child_spec(spec)
        return self._apply_catalog("static-mapping", (network_name, subnet, name), rest, True)

    def _child_spec(self, spec: str) -> Tuple[str, str]:
        parts = str(spec).split("|", 1)
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            raise ValueError("DHCP option requires an id and a name")
        return parts[0].strip(), parts[1]

    def set_client_class(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_set(self._versioned_path("client-class", "get_client_class", name))

    def delete_client_class(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_delete(
            self._versioned_path("client-class", "get_client_class_path", name)
        )

    def set_client_class_disable(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_set(
            self._versioned_path("client-class", "get_client_class_disable", name)
        )

    def delete_client_class_disable(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_delete(
            self._versioned_path("client-class", "get_client_class_disable_path", name)
        )

    def set_client_class_circuit_id(self, name: str, value: str) -> "DHCPServerBatchBuilder":
        return self.add_set(
            self._versioned_path("client-class", "get_client_class_circuit_id", name, value)
        )

    def delete_client_class_circuit_id(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_delete(
            self._versioned_path("client-class", "get_client_class_circuit_id_path", name)
        )

    def set_client_class_remote_id(self, name: str, value: str) -> "DHCPServerBatchBuilder":
        return self.add_set(
            self._versioned_path("client-class", "get_client_class_remote_id", name, value)
        )

    def delete_client_class_remote_id(self, name: str) -> "DHCPServerBatchBuilder":
        return self.add_delete(
            self._versioned_path("client-class", "get_client_class_remote_id_path", name)
        )

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        mapper = self._mapper()
        nodes = mapper.versioned_nodes()

        return {
            "fields": {
                # Basic configuration fields
                "subnet": {
                    "supported": True,
                    "description": "Subnet CIDR (e.g., 192.168.1.0/24)",
                },
                "subnet_id": {
                    "supported": "subnet-id" in nodes,
                    "description": "Subnet ID (VyOS 1.5+ required)",
                },
                "default_router": {
                    "supported": True,
                    "description": "Default gateway for clients",
                },
                "domain_name": {
                    "supported": True,
                    "description": "Domain name for DHCP clients",
                },
                "lease": {
                    "supported": True,
                    "description": "Lease time in seconds",
                },
                "description": {
                    "supported": True,
                    "description": "Human-readable description",
                },
                # Disable/enable flags
                "global_disable": {
                    "supported": True,
                    "description": "Disable the entire DHCP server",
                },
                "listen_address": {
                    "supported": True,
                    "description": "Addresses the DHCP server listens on",
                },
                "listen_interface": {
                    "supported": "listen-interface" in nodes,
                    "description": "Interfaces the DHCP server listens on",
                },
                "hostfile_update": {
                    "supported": True,
                    "description": "Write DHCP hostnames into the hosts file",
                },
                "host_decl_name": {
                    "supported": "host-decl-name" in nodes,
                    "description": "Use the host declaration name as the hostname",
                },
                "static_mapping_duid": {
                    "supported": "static-mapping duid" in nodes,
                    "description": "Identify a static mapping by DUID",
                },
                "static_mapping_description": {
                    "supported": "static-mapping description" in nodes,
                    "description": "Static mapping description",
                },
                "failover": {
                    "supported": True,
                    "description": "DHCP high-availability peer",
                    "modes": mapper.failover_modes(),
                    "statuses": mapper.failover_statuses(),
                },
                "failover_certificate": {
                    "supported": "high-availability certificate" in nodes
                    and "high-availability ca-certificate" in nodes,
                    "description": "TLS certificate for DHCP high availability",
                },
                "dynamic_dns_update_leaf": {
                    "supported": "dynamic-dns-update" in nodes,
                    "description": "Enable DHCP dynamic DNS updates",
                },
                "dynamic_dns_update_kea": {
                    "supported": "dynamic-dns-update send-updates" in nodes,
                    "description": "Kea dynamic DNS update settings",
                    "toggle_values": mapper.ddns_toggle_values(),
                    "replace_client_name_values": mapper.ddns_replace_client_name_values(),
                    "tsig_algorithms": mapper.ddns_tsig_algorithms(),
                },
                "network_disable": {
                    "supported": True,
                    "description": "Disable a shared network",
                },
                "subnet_disable": {
                    "supported": "subnet disable" in nodes,
                    "description": "Disable a subnet",
                },
                # DNS fields
                "name_servers": {
                    "supported": True,
                    "description": "DNS server addresses",
                },
                "domain_search": {
                    "supported": True,
                    "description": "DNS search domains",
                },
                # Pool fields
                "ranges": {
                    "supported": True,
                    "description": "DHCP IP address ranges",
                },
                "excludes": {
                    "supported": True,
                    "description": "IP addresses to exclude from pool",
                },
                # Advanced options - Boot/PXE
                "bootfile_name": {
                    "supported": True,
                    "description": "Boot file name for PXE clients",
                },
                "bootfile_server": {
                    "supported": True,
                    "description": "Boot server IP address",
                },
                "tftp_server_name": {
                    "supported": True,
                    "description": "TFTP server hostname",
                },
                # Advanced options - Time/NTP
                "time_servers": {
                    "supported": True,
                    "description": "Time server addresses",
                },
                "ntp_servers": {
                    "supported": True,
                    "description": "NTP server addresses",
                },
                "time_offset": {
                    "supported": True,
                    "description": "Time offset in seconds",
                },
                # Advanced options - Windows/WINS
                "wins_servers": {
                    "supported": True,
                    "description": "WINS server addresses",
                },
                # Advanced options - Other
                "client_prefix_length": {
                    "supported": True,
                    "description": "Client prefix length for IPv4",
                },
                "wpad_url": {
                    "supported": True,
                    "description": "Web Proxy Auto-Discovery URL",
                },
                # Options
                "ping_check": {
                    "supported": True,
                    "description": "Test IP with ping before assignment",
                },
                "enable_failover": {
                    "supported": "subnet enable-failover" in nodes,
                    "description": "High availability failover",
                },
                "clear_inactive_lease": {
                    "supported": mapper.CLEARS_INACTIVE_LEASES,
                    "description": "Clear leases that are not in the active state",
                },
                "client_class": {
                    "supported": "client-class" in nodes,
                    "description": "Named DHCP client classes",
                },
            },
            "catalog": mapper.catalog(),
        }
