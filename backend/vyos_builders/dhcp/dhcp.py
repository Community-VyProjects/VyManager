"""
DHCP Server Batch Builder

Provides all DHCP batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPBatchBuilder:
    """Complete batch builder for DHCP server operations"""

    def __init__(self, version: str):
        """Initialize DHCP batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get DHCP mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "dhcp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DHCPBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Global DHCP Server Operations
    # ========================================================================

    def set_listen_address(self, address: str) -> "DHCPBatchBuilder":
        """Set DHCP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "DHCPBatchBuilder":
        """Delete DHCP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    def set_hostfile_update(self) -> "DHCPBatchBuilder":
        """Enable hostfile-update."""
        path = self.mappers[self.mapper_key].get_hostfile_update()
        return self.add_set(path)

    def delete_hostfile_update(self) -> "DHCPBatchBuilder":
        """Disable hostfile-update."""
        path = self.mappers[self.mapper_key].get_hostfile_update_path()
        return self.add_delete(path)

    def set_host_decl_name(self) -> "DHCPBatchBuilder":
        """Enable host-decl-name."""
        path = self.mappers[self.mapper_key].get_host_decl_name()
        return self.add_set(path)

    def delete_host_decl_name(self) -> "DHCPBatchBuilder":
        """Disable host-decl-name."""
        path = self.mappers[self.mapper_key].get_host_decl_name_path()
        return self.add_delete(path)

    # ========================================================================
    # Shared Network Operations
    # ========================================================================

    def set_shared_network(self, network_name: str) -> "DHCPBatchBuilder":
        """Create shared network."""
        path = self.mappers[self.mapper_key].get_shared_network(network_name)
        return self.add_set(path)

    def delete_shared_network(self, network_name: str) -> "DHCPBatchBuilder":
        """Delete shared network."""
        path = self.mappers[self.mapper_key].get_shared_network_path(network_name)
        return self.add_delete(path)

    def set_shared_network_authoritative(
        self, network_name: str
    ) -> "DHCPBatchBuilder":
        """Set shared network authoritative."""
        path = self.mappers[self.mapper_key].get_shared_network_authoritative(
            network_name
        )
        return self.add_set(path)

    def delete_shared_network_authoritative(
        self, network_name: str
    ) -> "DHCPBatchBuilder":
        """Delete shared network authoritative."""
        path = self.mappers[self.mapper_key].get_shared_network_authoritative_path(
            network_name
        )
        return self.add_delete(path)

    def set_shared_network_name_server(
        self, network_name: str, name_server: str
    ) -> "DHCPBatchBuilder":
        """Set shared network name-server."""
        path = self.mappers[self.mapper_key].get_shared_network_name_server(
            network_name, name_server
        )
        return self.add_set(path)

    def delete_shared_network_name_server(
        self, network_name: str, name_server: str
    ) -> "DHCPBatchBuilder":
        """Delete shared network name-server."""
        path = self.mappers[self.mapper_key].get_shared_network_name_server_path(
            network_name, name_server
        )
        return self.add_delete(path)

    def set_shared_network_domain_name(
        self, network_name: str, domain_name: str
    ) -> "DHCPBatchBuilder":
        """Set shared network domain-name."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_name(
            network_name, domain_name
        )
        return self.add_set(path)

    def delete_shared_network_domain_name(
        self, network_name: str
    ) -> "DHCPBatchBuilder":
        """Delete shared network domain-name."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_name_path(
            network_name
        )
        return self.add_delete(path)

    def set_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> "DHCPBatchBuilder":
        """Set shared network domain-search."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_search(
            network_name, domain_search
        )
        return self.add_set(path)

    def delete_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> "DHCPBatchBuilder":
        """Delete shared network domain-search."""
        path = self.mappers[self.mapper_key].get_shared_network_domain_search_path(
            network_name, domain_search
        )
        return self.add_delete(path)

    def set_shared_network_ping_check(self, network_name: str) -> "DHCPBatchBuilder":
        """Enable shared network ping-check."""
        path = self.mappers[self.mapper_key].get_shared_network_ping_check(
            network_name
        )
        return self.add_set(path)

    def delete_shared_network_ping_check(
        self, network_name: str
    ) -> "DHCPBatchBuilder":
        """Disable shared network ping-check."""
        path = self.mappers[self.mapper_key].get_shared_network_ping_check_path(
            network_name
        )
        return self.add_delete(path)

    # ========================================================================
    # Subnet Operations
    # ========================================================================

    def set_subnet(self, network_name: str, subnet: str) -> "DHCPBatchBuilder":
        """Create subnet."""
        path = self.mappers[self.mapper_key].get_subnet(network_name, subnet)
        return self.add_set(path)

    def delete_subnet(self, network_name: str, subnet: str) -> "DHCPBatchBuilder":
        """Delete subnet."""
        path = self.mappers[self.mapper_key].get_subnet_path(network_name, subnet)
        return self.add_delete(path)

    def set_subnet_subnet_id(
        self, network_name: str, subnet: str, subnet_id: int
    ) -> "DHCPBatchBuilder":
        """Set subnet-id (VyOS 1.5 only)."""
        path = self.mappers[self.mapper_key].get_subnet_subnet_id(
            network_name, subnet, subnet_id
        )
        return self.add_set(path)

    def delete_subnet_subnet_id(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet-id."""
        path = self.mappers[self.mapper_key].get_subnet_subnet_id_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> "DHCPBatchBuilder":
        """Set subnet default-router (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_default_router(
            network_name, subnet, router
        )
        return self.add_set(path)

    def delete_subnet_default_router(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet default-router."""
        path = self.mappers[self.mapper_key].get_subnet_default_router_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet name-server (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_name_server(
            network_name, subnet, name_server
        )
        return self.add_set(path)

    def delete_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet name-server."""
        path = self.mappers[self.mapper_key].get_subnet_name_server_path(
            network_name, subnet, name_server
        )
        return self.add_delete(path)

    def set_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> "DHCPBatchBuilder":
        """Set subnet domain-name (version-aware)."""
        path = self.mappers[self.mapper_key].get_subnet_domain_name(
            network_name, subnet, domain_name
        )
        return self.add_set(path)

    def delete_subnet_domain_name(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet domain-name."""
        path = self.mappers[self.mapper_key].get_subnet_domain_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_lease(
        self, network_name: str, subnet: str, lease: str
    ) -> "DHCPBatchBuilder":
        """Set subnet lease time."""
        path = self.mappers[self.mapper_key].get_subnet_lease(
            network_name, subnet, lease
        )
        return self.add_set(path)

    def delete_subnet_lease(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet lease."""
        path = self.mappers[self.mapper_key].get_subnet_lease_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> "DHCPBatchBuilder":
        """Set subnet domain-search."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search(
            network_name, subnet, domain_search
        )
        return self.add_set(path)

    def delete_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet domain-search."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search_path(
            network_name, subnet, domain_search
        )
        return self.add_delete(path)

    def set_subnet_ping_check(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Enable subnet ping-check."""
        path = self.mappers[self.mapper_key].get_subnet_ping_check(
            network_name, subnet
        )
        return self.add_set(path)

    def delete_subnet_ping_check(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Disable subnet ping-check."""
        path = self.mappers[self.mapper_key].get_subnet_ping_check_path(
            network_name, subnet
        )
        return self.add_delete(path)

    # ========================================================================
    # Range Operations
    # ========================================================================

    def set_subnet_range(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPBatchBuilder":
        """Create subnet range."""
        path = self.mappers[self.mapper_key].get_subnet_range(
            network_name, subnet, range_id
        )
        return self.add_set(path)

    def delete_subnet_range(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet range."""
        path = self.mappers[self.mapper_key].get_subnet_range_path(
            network_name, subnet, range_id
        )
        return self.add_delete(path)

    def set_subnet_range_start(
        self, network_name: str, subnet: str, range_id: str, start: str
    ) -> "DHCPBatchBuilder":
        """Set subnet range start address."""
        path = self.mappers[self.mapper_key].get_subnet_range_start(
            network_name, subnet, range_id, start
        )
        return self.add_set(path)

    def delete_subnet_range_start(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet range start address."""
        path = self.mappers[self.mapper_key].get_subnet_range_start_path(
            network_name, subnet, range_id
        )
        return self.add_delete(path)

    def set_subnet_range_stop(
        self, network_name: str, subnet: str, range_id: str, stop: str
    ) -> "DHCPBatchBuilder":
        """Set subnet range stop address."""
        path = self.mappers[self.mapper_key].get_subnet_range_stop(
            network_name, subnet, range_id, stop
        )
        return self.add_set(path)

    def delete_subnet_range_stop(
        self, network_name: str, subnet: str, range_id: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet range stop address."""
        path = self.mappers[self.mapper_key].get_subnet_range_stop_path(
            network_name, subnet, range_id
        )
        return self.add_delete(path)

    # ========================================================================
    # Exclude Operations
    # ========================================================================

    def set_subnet_exclude(
        self, network_name: str, subnet: str, address: str
    ) -> "DHCPBatchBuilder":
        """Add subnet exclude address."""
        path = self.mappers[self.mapper_key].get_subnet_exclude(
            network_name, subnet, address
        )
        return self.add_set(path)

    def delete_subnet_exclude(
        self, network_name: str, subnet: str, address: str
    ) -> "DHCPBatchBuilder":
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
    ) -> "DHCPBatchBuilder":
        """Create static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping(
            network_name, subnet, mapping_name
        )
        return self.add_set(path)

    def delete_static_mapping(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPBatchBuilder":
        """Delete static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_ip_address(
        self, network_name: str, subnet: str, mapping_name: str, ip_address: str
    ) -> "DHCPBatchBuilder":
        """Set static mapping IP address."""
        path = self.mappers[self.mapper_key].get_static_mapping_ip_address(
            network_name, subnet, mapping_name, ip_address
        )
        return self.add_set(path)

    def delete_static_mapping_ip_address(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPBatchBuilder":
        """Delete static mapping IP address."""
        path = self.mappers[self.mapper_key].get_static_mapping_ip_address_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_mac_address(
        self, network_name: str, subnet: str, mapping_name: str, mac_address: str
    ) -> "DHCPBatchBuilder":
        """Set static mapping MAC address."""
        path = self.mappers[self.mapper_key].get_static_mapping_mac_address(
            network_name, subnet, mapping_name, mac_address
        )
        return self.add_set(path)

    def delete_static_mapping_mac_address(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPBatchBuilder":
        """Delete static mapping MAC address."""
        path = self.mappers[self.mapper_key].get_static_mapping_mac_address_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    def set_static_mapping_disable(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPBatchBuilder":
        """Disable static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_disable(
            network_name, subnet, mapping_name
        )
        return self.add_set(path)

    def delete_static_mapping_disable(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> "DHCPBatchBuilder":
        """Enable static mapping."""
        path = self.mappers[self.mapper_key].get_static_mapping_disable_path(
            network_name, subnet, mapping_name
        )
        return self.add_delete(path)

    # ========================================================================
    # Additional Subnet Options
    # ========================================================================

    def set_subnet_bootfile_name(
        self, network_name: str, subnet: str, bootfile: str
    ) -> "DHCPBatchBuilder":
        """Set subnet bootfile-name."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_name(
            network_name, subnet, bootfile
        )
        return self.add_set(path)

    def delete_subnet_bootfile_name(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet bootfile-name."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_bootfile_server(
        self, network_name: str, subnet: str, server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet bootfile-server."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_server(
            network_name, subnet, server
        )
        return self.add_set(path)

    def delete_subnet_bootfile_server(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet bootfile-server."""
        path = self.mappers[self.mapper_key].get_subnet_bootfile_server_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_tftp_server_name(
        self, network_name: str, subnet: str, tftp_server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet tftp-server-name."""
        path = self.mappers[self.mapper_key].get_subnet_tftp_server_name(
            network_name, subnet, tftp_server
        )
        return self.add_set(path)

    def delete_subnet_tftp_server_name(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet tftp-server-name."""
        path = self.mappers[self.mapper_key].get_subnet_tftp_server_name_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet time-server."""
        path = self.mappers[self.mapper_key].get_subnet_time_server(
            network_name, subnet, time_server
        )
        return self.add_set(path)

    def delete_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet time-server."""
        path = self.mappers[self.mapper_key].get_subnet_time_server_path(
            network_name, subnet, time_server
        )
        return self.add_delete(path)

    def set_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet ntp-server."""
        path = self.mappers[self.mapper_key].get_subnet_ntp_server(
            network_name, subnet, ntp_server
        )
        return self.add_set(path)

    def delete_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet ntp-server."""
        path = self.mappers[self.mapper_key].get_subnet_ntp_server_path(
            network_name, subnet, ntp_server
        )
        return self.add_delete(path)

    def set_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> "DHCPBatchBuilder":
        """Set subnet wins-server."""
        path = self.mappers[self.mapper_key].get_subnet_wins_server(
            network_name, subnet, wins_server
        )
        return self.add_set(path)

    def delete_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet wins-server."""
        path = self.mappers[self.mapper_key].get_subnet_wins_server_path(
            network_name, subnet, wins_server
        )
        return self.add_delete(path)

    def set_subnet_time_offset(
        self, network_name: str, subnet: str, offset: str
    ) -> "DHCPBatchBuilder":
        """Set subnet time-offset."""
        path = self.mappers[self.mapper_key].get_subnet_time_offset(
            network_name, subnet, offset
        )
        return self.add_set(path)

    def delete_subnet_time_offset(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet time-offset."""
        path = self.mappers[self.mapper_key].get_subnet_time_offset_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_client_prefix_length(
        self, network_name: str, subnet: str, prefix_length: str
    ) -> "DHCPBatchBuilder":
        """Set subnet client-prefix-length."""
        path = self.mappers[self.mapper_key].get_subnet_client_prefix_length(
            network_name, subnet, prefix_length
        )
        return self.add_set(path)

    def delete_subnet_client_prefix_length(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Delete subnet client-prefix-length."""
        path = self.mappers[self.mapper_key].get_subnet_client_prefix_length_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_subnet_wpad_url(
        self, network_name: str, subnet: str, url: str
    ) -> "DHCPBatchBuilder":
        """Set subnet wpad-url."""
        path = self.mappers[self.mapper_key].get_subnet_wpad_url(
            network_name, subnet, url
        )
        return self.add_set(path)

    def delete_subnet_wpad_url(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
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
    ) -> "DHCPBatchBuilder":
        """Enable subnet failover."""
        path = self.mappers[self.mapper_key].get_subnet_enable_failover(
            network_name, subnet
        )
        return self.add_set(path)

    def delete_subnet_enable_failover(
        self, network_name: str, subnet: str
    ) -> "DHCPBatchBuilder":
        """Disable subnet failover."""
        path = self.mappers[self.mapper_key].get_subnet_enable_failover_path(
            network_name, subnet
        )
        return self.add_delete(path)

    def set_failover_mode(self, mode: str) -> "DHCPBatchBuilder":
        """Set failover mode."""
        path = self.mappers[self.mapper_key].get_failover_mode(mode)
        return self.add_set(path)

    def delete_failover_mode(self) -> "DHCPBatchBuilder":
        """Delete failover mode."""
        path = self.mappers[self.mapper_key].get_failover_mode_path()
        return self.add_delete(path)

    def set_failover_name(self, name: str) -> "DHCPBatchBuilder":
        """Set failover name."""
        path = self.mappers[self.mapper_key].get_failover_name(name)
        return self.add_set(path)

    def delete_failover_name(self) -> "DHCPBatchBuilder":
        """Delete failover name."""
        path = self.mappers[self.mapper_key].get_failover_name_path()
        return self.add_delete(path)

    def set_failover_source_address(self, address: str) -> "DHCPBatchBuilder":
        """Set failover source-address."""
        path = self.mappers[self.mapper_key].get_failover_source_address(address)
        return self.add_set(path)

    def delete_failover_source_address(self) -> "DHCPBatchBuilder":
        """Delete failover source-address."""
        path = self.mappers[self.mapper_key].get_failover_source_address_path()
        return self.add_delete(path)

    def set_failover_remote(self, remote: str) -> "DHCPBatchBuilder":
        """Set failover remote."""
        path = self.mappers[self.mapper_key].get_failover_remote(remote)
        return self.add_set(path)

    def delete_failover_remote(self) -> "DHCPBatchBuilder":
        """Delete failover remote."""
        path = self.mappers[self.mapper_key].get_failover_remote_path()
        return self.add_delete(path)

    def set_failover_status(self, status: str) -> "DHCPBatchBuilder":
        """Set failover status."""
        path = self.mappers[self.mapper_key].get_failover_status(status)
        return self.add_set(path)

    def delete_failover_status(self) -> "DHCPBatchBuilder":
        """Delete failover status."""
        path = self.mappers[self.mapper_key].get_failover_status_path()
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        has_subnet_id = self.mappers[self.mapper_key].has_subnet_id()
        is_v15_or_later = "1.5" in self.version or "latest" in self.version
        is_v14 = "1.4" in self.version

        return {
            "version": self.version,
            "has_subnet_id": has_subnet_id,
            "fields": {
                # Basic configuration fields
                "subnet": {
                    "supported": True,
                    "description": "Subnet CIDR (e.g., 192.168.1.0/24)",
                },
                "subnet_id": {
                    "supported": has_subnet_id,
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
                    "supported": is_v15_or_later,
                    "description": "Time offset in seconds (VyOS 1.5+)",
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
                    "supported": is_v14,
                    "description": "High availability failover (VyOS 1.4 only)",
                },
            },
            "version_notes": {
                "subnet_id_required": has_subnet_id,
                "option_prefix": is_v15_or_later,
                "subnet_failover_removed": not is_v14,
                "time_offset_requires_option_prefix": is_v15_or_later,
            },
        }
