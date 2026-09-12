"""DHCP Server mapper for all VyOS versions.

Handles command path generation for DHCP server configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import FrozenSet, List
from ..base import BaseFeatureMapper
from .dhcp_versions import DHCPMapperV1_4, DHCPMapperV1_5


class DHCPMapper(BaseFeatureMapper):
    """Base mapper for DHCP server configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = DHCPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = DHCPMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = DHCPMapperV1_5()

    # ==================== Global DHCP Server Commands ====================

    def get_global_disable(self) -> List[str]:
        """Get command path for global DHCP server disable."""
        return ["service", "dhcp-server", "disable"]

    def get_global_disable_path(self) -> List[str]:
        """Get command path for global DHCP server disable deletion."""
        return ["service", "dhcp-server", "disable"]

    def get_listen_address(self, address: str) -> List[str]:
        """Get command path for DHCP listen address."""
        return ["service", "dhcp-server", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        """Get command path for listen address deletion."""
        return ["service", "dhcp-server", "listen-address", address]

    def get_hostfile_update(self) -> List[str]:
        """Get command path for hostfile-update."""
        return ["service", "dhcp-server", "hostfile-update"]

    def get_hostfile_update_path(self) -> List[str]:
        """Get command path for hostfile-update deletion."""
        return ["service", "dhcp-server", "hostfile-update"]

    def has_host_decl_name(self) -> bool:
        return "1.4" in self.version

    def has_listen_interface(self) -> bool:
        return "1.4" not in self.version

    def has_static_mapping_duid(self) -> bool:
        return "1.4" not in self.version

    def has_enable_failover(self) -> bool:
        return "1.4" in self.version

    def has_subnet_disable(self) -> bool:
        return "1.4" not in self.version

    def has_dynamic_dns_update_leaf(self) -> bool:
        return "1.4" in self.version

    def has_dynamic_dns_update_kea(self) -> bool:
        return "1.4" not in self.version

    def has_failover_certificate(self) -> bool:
        return "1.4" not in self.version

    def has_time_offset(self) -> bool:
        return True

    def get_host_decl_name(self) -> List[str]:
        """Get command path for host-decl-name."""
        if not self.has_host_decl_name():
            raise ValueError("host-decl-name is not supported on this device")
        return ["service", "dhcp-server", "host-decl-name"]

    def get_host_decl_name_path(self) -> List[str]:
        """Get command path for host-decl-name deletion."""
        return ["service", "dhcp-server", "host-decl-name"]

    def get_listen_interface(self, interface: str) -> List[str]:
        if not self.has_listen_interface():
            raise ValueError("listen-interface is not supported on this device")
        return ["service", "dhcp-server", "listen-interface", interface]

    def get_listen_interface_path(self, interface: str) -> List[str]:
        return ["service", "dhcp-server", "listen-interface", interface]

    # ==================== Shared Network Commands ====================

    def get_shared_network(self, network_name: str) -> List[str]:
        """Get command path for shared network."""
        return ["service", "dhcp-server", "shared-network-name", network_name]

    def get_shared_network_path(self, network_name: str) -> List[str]:
        """Get command path for shared network deletion."""
        return ["service", "dhcp-server", "shared-network-name", network_name]

    def get_shared_network_authoritative(self, network_name: str) -> List[str]:
        """Get command path for shared network authoritative."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "authoritative"
        ]

    def get_shared_network_authoritative_path(self, network_name: str) -> List[str]:
        """Get command path for authoritative deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "authoritative"
        ]

    def get_shared_network_name_server(
        self, network_name: str, name_server: str
    ) -> List[str]:
        """Get command path for shared network name-server (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_name_server'):
            return self.version_mapper.get_shared_network_name_server(network_name, name_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "name-server", name_server
        ]

    def get_shared_network_name_server_path(
        self, network_name: str, name_server: str
    ) -> List[str]:
        """Get command path for specific shared network name-server deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_name_server_path'):
            return self.version_mapper.get_shared_network_name_server_path(network_name, name_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "name-server", name_server
        ]

    def get_shared_network_domain_name(
        self, network_name: str, domain_name: str
    ) -> List[str]:
        """Get command path for shared network domain-name (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_domain_name'):
            return self.version_mapper.get_shared_network_domain_name(network_name, domain_name)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "domain-name", domain_name
        ]

    def get_shared_network_domain_name_path(self, network_name: str) -> List[str]:
        """Get command path for shared network domain-name deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_domain_name_path'):
            return self.version_mapper.get_shared_network_domain_name_path(network_name)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "domain-name"
        ]

    def get_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> List[str]:
        """Get command path for shared network domain-search (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_domain_search'):
            return self.version_mapper.get_shared_network_domain_search(network_name, domain_search)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "domain-search", domain_search
        ]

    def get_shared_network_domain_search_path(
        self, network_name: str, domain_search: str
    ) -> List[str]:
        """Get command path for specific shared network domain-search deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_shared_network_domain_search_path'):
            return self.version_mapper.get_shared_network_domain_search_path(network_name, domain_search)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "domain-search", domain_search
        ]

    def get_shared_network_ping_check(self, network_name: str) -> List[str]:
        """Get command path for shared network ping-check."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "ping-check"
        ]

    def get_shared_network_ping_check_path(self, network_name: str) -> List[str]:
        """Get command path for ping-check deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "ping-check"
        ]

    def get_shared_network_disable(self, network_name: str) -> List[str]:
        """Get command path for shared network disable."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "disable"
        ]

    def get_shared_network_disable_path(self, network_name: str) -> List[str]:
        """Get command path for shared network disable deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "disable"
        ]

    def get_shared_network_description(
        self, network_name: str, description: str
    ) -> List[str]:
        """Get command path for shared network description."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "description", description
        ]

    def get_shared_network_description_path(self, network_name: str) -> List[str]:
        """Get command path for shared network description deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "description"
        ]

    # ==================== Subnet Commands ====================

    def get_subnet(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet
        ]

    def get_subnet_path(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet
        ]

    def get_subnet_disable(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet disable."""
        if not self.has_subnet_disable():
            raise ValueError("subnet disable is not supported on this device")
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "disable"
        ]

    def get_subnet_disable_path(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet disable deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "disable"
        ]

    def get_subnet_description(
        self, network_name: str, subnet: str, description: str
    ) -> List[str]:
        """Get command path for subnet description."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "description", description
        ]

    def get_subnet_description_path(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet description deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "description"
        ]

    def get_subnet_lease(
        self, network_name: str, subnet: str, lease: str
    ) -> List[str]:
        """Get command path for subnet lease time."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "lease", lease
        ]

    def get_subnet_lease_path(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet lease deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "lease"
        ]

    # ==================== Range Commands ====================

    def get_subnet_range(
        self, network_name: str, subnet: str, range_id: str
    ) -> List[str]:
        """Get command path for subnet range."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id
        ]

    def get_subnet_range_path(
        self, network_name: str, subnet: str, range_id: str
    ) -> List[str]:
        """Get command path for range deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id
        ]

    def get_subnet_range_start(
        self, network_name: str, subnet: str, range_id: str, start: str
    ) -> List[str]:
        """Get command path for range start address."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id, "start", start
        ]

    def get_subnet_range_start_path(
        self, network_name: str, subnet: str, range_id: str
    ) -> List[str]:
        """Get command path for range start deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id, "start"
        ]

    def get_subnet_range_stop(
        self, network_name: str, subnet: str, range_id: str, stop: str
    ) -> List[str]:
        """Get command path for range stop address."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id, "stop", stop
        ]

    def get_subnet_range_stop_path(
        self, network_name: str, subnet: str, range_id: str
    ) -> List[str]:
        """Get command path for range stop deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "range", range_id, "stop"
        ]

    # ==================== Exclude Commands ====================

    def get_subnet_exclude(
        self, network_name: str, subnet: str, address: str
    ) -> List[str]:
        """Get command path for subnet exclude address (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_exclude'):
            return self.version_mapper.get_subnet_exclude(network_name, subnet, address)
        # Fallback to 1.4 format
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "exclude", address
        ]

    def get_subnet_exclude_path(
        self, network_name: str, subnet: str, address: str
    ) -> List[str]:
        """Get command path for exclude address deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_exclude_path'):
            return self.version_mapper.get_subnet_exclude_path(network_name, subnet, address)
        # Fallback to 1.4 format
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "exclude", address
        ]

    # ==================== Static Mapping Commands ====================

    def get_static_mapping(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name
        ]

    def get_static_mapping_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name
        ]

    def get_static_mapping_ip_address(
        self, network_name: str, subnet: str, mapping_name: str, ip_address: str
    ) -> List[str]:
        """Get command path for static mapping IP address."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "ip-address", ip_address
        ]

    def get_static_mapping_ip_address_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping IP address deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "ip-address"
        ]

    def get_static_mapping_mac_address(
        self, network_name: str, subnet: str, mapping_name: str, mac_address: str
    ) -> List[str]:
        """Get command path for static mapping MAC address (version-aware: 1.4='mac-address', 1.5='mac')."""
        if hasattr(self.version_mapper, 'get_static_mapping_mac_address'):
            return self.version_mapper.get_static_mapping_mac_address(
                network_name, subnet, mapping_name, mac_address
            )
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "mac", mac_address
        ]

    def get_static_mapping_mac_address_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping MAC address deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_static_mapping_mac_address_path'):
            return self.version_mapper.get_static_mapping_mac_address_path(
                network_name, subnet, mapping_name
            )
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "mac"
        ]

    def get_static_mapping_description(
        self, network_name: str, subnet: str, mapping_name: str, description: str
    ) -> List[str]:
        """Get command path for static mapping description."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "description", description
        ]

    def get_static_mapping_description_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping description deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "description"
        ]

    def get_static_mapping_disable(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping disable."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "disable"
        ]

    def get_static_mapping_disable_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        """Get command path for static mapping disable deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "disable"
        ]

    def get_static_mapping_duid(
        self, network_name: str, subnet: str, mapping_name: str, duid: str
    ) -> List[str]:
        if not self.has_static_mapping_duid():
            raise ValueError("static-mapping duid is not supported on this device")
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "duid", duid
        ]

    def get_static_mapping_duid_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "static-mapping", mapping_name, "duid"
        ]

    # ==================== Subnet Options (Common) ====================

    def get_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        """Get command path for subnet domain-search (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_domain_search'):
            return self.version_mapper.get_subnet_domain_search(network_name, subnet, domain_search)
        # Fallback to 1.4 format
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "domain-search", domain_search
        ]

    def get_subnet_domain_search_path(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        """Get command path for subnet domain-search deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_domain_search_path'):
            return self.version_mapper.get_subnet_domain_search_path(network_name, subnet, domain_search)
        # Fallback to 1.4 format
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "domain-search", domain_search
        ]

    def get_subnet_ping_check(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet ping-check."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "ping-check"
        ]

    def get_subnet_ping_check_path(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet ping-check deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "ping-check"
        ]

    # ==================== Additional Options ====================

    def get_subnet_bootfile_name(
        self, network_name: str, subnet: str, bootfile: str
    ) -> List[str]:
        """Get command path for subnet bootfile-name (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_bootfile_name'):
            return self.version_mapper.get_subnet_bootfile_name(network_name, subnet, bootfile)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "bootfile-name", bootfile
        ]

    def get_subnet_bootfile_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet bootfile-name deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_bootfile_name_path'):
            return self.version_mapper.get_subnet_bootfile_name_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "bootfile-name"
        ]

    def get_subnet_bootfile_server(
        self, network_name: str, subnet: str, server: str
    ) -> List[str]:
        """Get command path for subnet bootfile-server (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_bootfile_server'):
            return self.version_mapper.get_subnet_bootfile_server(network_name, subnet, server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "bootfile-server", server
        ]

    def get_subnet_bootfile_server_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet bootfile-server deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_bootfile_server_path'):
            return self.version_mapper.get_subnet_bootfile_server_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "bootfile-server"
        ]

    def get_subnet_tftp_server_name(
        self, network_name: str, subnet: str, tftp_server: str
    ) -> List[str]:
        """Get command path for subnet tftp-server-name (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_tftp_server_name'):
            return self.version_mapper.get_subnet_tftp_server_name(network_name, subnet, tftp_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "tftp-server-name", tftp_server
        ]

    def get_subnet_tftp_server_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet tftp-server-name deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_tftp_server_name_path'):
            return self.version_mapper.get_subnet_tftp_server_name_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "tftp-server-name"
        ]

    def get_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        """Get command path for subnet time-server (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_time_server'):
            return self.version_mapper.get_subnet_time_server(network_name, subnet, time_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "time-server", time_server
        ]

    def get_subnet_time_server_path(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        """Get command path for subnet time-server deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_time_server_path'):
            return self.version_mapper.get_subnet_time_server_path(network_name, subnet, time_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "time-server", time_server
        ]

    def get_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        """Get command path for subnet ntp-server (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_ntp_server'):
            return self.version_mapper.get_subnet_ntp_server(network_name, subnet, ntp_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "ntp-server", ntp_server
        ]

    def get_subnet_ntp_server_path(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        """Get command path for subnet ntp-server deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_ntp_server_path'):
            return self.version_mapper.get_subnet_ntp_server_path(network_name, subnet, ntp_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "ntp-server", ntp_server
        ]

    def get_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        """Get command path for subnet wins-server (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_wins_server'):
            return self.version_mapper.get_subnet_wins_server(network_name, subnet, wins_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "wins-server", wins_server
        ]

    def get_subnet_wins_server_path(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        """Get command path for subnet wins-server deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_wins_server_path'):
            return self.version_mapper.get_subnet_wins_server_path(network_name, subnet, wins_server)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "wins-server", wins_server
        ]

    def get_subnet_time_offset(
        self, network_name: str, subnet: str, offset: str
    ) -> List[str]:
        """Get command path for subnet time-offset (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_time_offset'):
            return self.version_mapper.get_subnet_time_offset(network_name, subnet, offset)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "time-offset", offset
        ]

    def get_subnet_time_offset_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet time-offset deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_time_offset_path'):
            return self.version_mapper.get_subnet_time_offset_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "time-offset"
        ]

    def get_subnet_client_prefix_length(
        self, network_name: str, subnet: str, prefix_length: str
    ) -> List[str]:
        """Get command path for subnet client-prefix-length (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_client_prefix_length'):
            return self.version_mapper.get_subnet_client_prefix_length(network_name, subnet, prefix_length)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "client-prefix-length", prefix_length
        ]

    def get_subnet_client_prefix_length_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet client-prefix-length deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_client_prefix_length_path'):
            return self.version_mapper.get_subnet_client_prefix_length_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "client-prefix-length"
        ]

    def get_subnet_wpad_url(
        self, network_name: str, subnet: str, url: str
    ) -> List[str]:
        """Get command path for subnet wpad-url (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_wpad_url'):
            return self.version_mapper.get_subnet_wpad_url(network_name, subnet, url)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "wpad-url", url
        ]

    def get_subnet_wpad_url_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet wpad-url deletion (version-aware)."""
        if hasattr(self.version_mapper, 'get_subnet_wpad_url_path'):
            return self.version_mapper.get_subnet_wpad_url_path(network_name, subnet)
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "wpad-url"
        ]

    # ==================== Failover/High Availability ====================

    def get_subnet_enable_failover(self, network_name: str, subnet: str) -> List[str]:
        """Get command path for subnet enable-failover."""
        if not self.has_enable_failover():
            raise ValueError("enable-failover is not supported on this device")
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "enable-failover"
        ]

    def get_subnet_enable_failover_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet enable-failover deletion."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "enable-failover"
        ]

    def get_failover_mode(self, mode: str) -> List[str]:
        """Get command path for failover mode."""
        return ["service", "dhcp-server", "high-availability", "mode", mode]

    def get_failover_mode_path(self) -> List[str]:
        """Get command path for failover mode deletion."""
        return ["service", "dhcp-server", "high-availability", "mode"]

    def get_failover_name(self, name: str) -> List[str]:
        """Get command path for failover name."""
        return ["service", "dhcp-server", "high-availability", "name", name]

    def get_failover_name_path(self) -> List[str]:
        """Get command path for failover name deletion."""
        return ["service", "dhcp-server", "high-availability", "name"]

    def get_failover_source_address(self, address: str) -> List[str]:
        """Get command path for failover source-address."""
        return [
            "service", "dhcp-server", "high-availability", "source-address", address
        ]

    def get_failover_source_address_path(self) -> List[str]:
        """Get command path for failover source-address deletion."""
        return ["service", "dhcp-server", "high-availability", "source-address"]

    def get_failover_remote(self, remote: str) -> List[str]:
        """Get command path for failover remote."""
        return ["service", "dhcp-server", "high-availability", "remote", remote]

    def get_failover_remote_path(self) -> List[str]:
        """Get command path for failover remote deletion."""
        return ["service", "dhcp-server", "high-availability", "remote"]

    def get_failover_status(self, status: str) -> List[str]:
        """Get command path for failover status."""
        return ["service", "dhcp-server", "high-availability", "status", status]

    def get_failover_status_path(self) -> List[str]:
        """Get command path for failover status deletion."""
        return ["service", "dhcp-server", "high-availability", "status"]

    def get_failover_certificate(self, name: str) -> List[str]:
        if not self.has_failover_certificate():
            raise ValueError("high-availability certificate is not supported on this device")
        return ["service", "dhcp-server", "high-availability", "certificate", name]

    def get_failover_certificate_path(self) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "certificate"]

    def get_failover_ca_certificate(self, name: str) -> List[str]:
        if not self.has_failover_certificate():
            raise ValueError("high-availability ca-certificate is not supported on this device")
        return ["service", "dhcp-server", "high-availability", "ca-certificate", name]

    def get_failover_ca_certificate_path(self) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "ca-certificate"]

    def get_dynamic_dns_update(self) -> List[str]:
        if not self.has_dynamic_dns_update_leaf():
            raise ValueError("dynamic-dns-update leaf is not supported on this device")
        return ["service", "dhcp-server", "dynamic-dns-update"]

    def get_dynamic_dns_update_path(self) -> List[str]:
        return ["service", "dhcp-server", "dynamic-dns-update"]

    def _require_ddns_kea(self) -> None:
        if not self.has_dynamic_dns_update_kea():
            raise ValueError("Kea dynamic-dns-update is not supported on this device")

    # Container-level behavior leaves of the Kea dynamic-dns-update node. Each
    # is a single value-taking leaf under dynamic-dns-update/<field>. Kept as an
    # allowlist rather than one method per leaf so the set/delete path stays a
    # single validated shape.
    DDNS_SCALAR_FIELDS: FrozenSet[str] = frozenset({
        "conflict-resolution",
        "override-client-update",
        "override-no-update",
        "update-on-renew",
        "replace-client-name",
        "ttl-percent",
        "generated-prefix",
        "qualifying-suffix",
        "hostname-char-replacement",
        "hostname-char-set",
    })

    def _require_ddns_scalar_field(self, field: str) -> None:
        if field not in self.DDNS_SCALAR_FIELDS:
            raise ValueError(f"unsupported dynamic-dns-update field: {field}")

    def get_ddns_scalar(self, field: str, value: str) -> List[str]:
        self._require_ddns_kea()
        self._require_ddns_scalar_field(field)
        return ["service", "dhcp-server", "dynamic-dns-update", field, value]

    def get_ddns_scalar_path(self, field: str) -> List[str]:
        # Delete must stay reachable independent of the Kea set guard so a stale
        # leaf can be removed. Only the field name is validated here.
        self._require_ddns_scalar_field(field)
        return ["service", "dhcp-server", "dynamic-dns-update", field]

    def get_ddns_send_updates(self, value: str) -> List[str]:
        self._require_ddns_kea()
        return ["service", "dhcp-server", "dynamic-dns-update", "send-updates", value]

    def get_ddns_send_updates_path(self) -> List[str]:
        return ["service", "dhcp-server", "dynamic-dns-update", "send-updates"]

    def get_ddns_tsig_key(self, name: str) -> List[str]:
        self._require_ddns_kea()
        return ["service", "dhcp-server", "dynamic-dns-update", "tsig-key", name]

    def get_ddns_tsig_key_path(self, name: str) -> List[str]:
        return ["service", "dhcp-server", "dynamic-dns-update", "tsig-key", name]

    def get_ddns_tsig_key_algorithm(self, name: str, algorithm: str) -> List[str]:
        self._require_ddns_kea()
        return [
            "service", "dhcp-server", "dynamic-dns-update", "tsig-key", name,
            "algorithm", algorithm,
        ]

    def get_ddns_tsig_key_algorithm_path(self, name: str) -> List[str]:
        return [
            "service", "dhcp-server", "dynamic-dns-update", "tsig-key", name, "algorithm",
        ]

    def get_ddns_tsig_key_secret(self, name: str, secret: str) -> List[str]:
        self._require_ddns_kea()
        return [
            "service", "dhcp-server", "dynamic-dns-update", "tsig-key", name,
            "secret", secret,
        ]

    def get_ddns_tsig_key_secret_path(self, name: str) -> List[str]:
        return [
            "service", "dhcp-server", "dynamic-dns-update", "tsig-key", name, "secret",
        ]

    def get_ddns_domain(self, kind: str, domain: str) -> List[str]:
        self._require_ddns_kea()
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return ["service", "dhcp-server", "dynamic-dns-update", kind, domain]

    def get_ddns_domain_path(self, kind: str, domain: str) -> List[str]:
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return ["service", "dhcp-server", "dynamic-dns-update", kind, domain]

    def get_ddns_domain_key_name(self, kind: str, domain: str, key_name: str) -> List[str]:
        self._require_ddns_kea()
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain,
            "key-name", key_name,
        ]

    def get_ddns_domain_key_name_path(self, kind: str, domain: str) -> List[str]:
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain, "key-name",
        ]

    def get_ddns_domain_dns_server_address(
        self, kind: str, domain: str, server_id: str, address: str
    ) -> List[str]:
        self._require_ddns_kea()
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain,
            "dns-server", server_id, "address", address,
        ]

    def get_ddns_domain_dns_server_address_path(
        self, kind: str, domain: str, server_id: str
    ) -> List[str]:
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain,
            "dns-server", server_id, "address",
        ]

    def get_ddns_domain_dns_server_port(
        self, kind: str, domain: str, server_id: str, port: str
    ) -> List[str]:
        self._require_ddns_kea()
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain,
            "dns-server", server_id, "port", port,
        ]

    def get_ddns_domain_dns_server_path(
        self, kind: str, domain: str, server_id: str
    ) -> List[str]:
        if kind not in ("forward-domain", "reverse-domain"):
            raise ValueError("invalid DDNS domain kind")
        return [
            "service", "dhcp-server", "dynamic-dns-update", kind, domain,
            "dns-server", server_id,
        ]

    # ==================== Version-Specific Delegates ====================

    def get_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> List[str]:
        """Get command path for subnet default-router (version-aware)."""
        return self.version_mapper.get_subnet_default_router(
            network_name, subnet, router
        )

    def get_subnet_default_router_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet default-router deletion (version-aware)."""
        return self.version_mapper.get_subnet_default_router_path(network_name, subnet)

    def get_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for subnet name-server (version-aware)."""
        return self.version_mapper.get_subnet_name_server(
            network_name, subnet, name_server
        )

    def get_subnet_name_server_path(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        """Get command path for subnet name-server deletion (version-aware)."""
        return self.version_mapper.get_subnet_name_server_path(
            network_name, subnet, name_server
        )

    def get_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> List[str]:
        """Get command path for subnet domain-name (version-aware)."""
        return self.version_mapper.get_subnet_domain_name(
            network_name, subnet, domain_name
        )

    def get_subnet_domain_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet domain-name deletion (version-aware)."""
        return self.version_mapper.get_subnet_domain_name_path(network_name, subnet)

    def get_subnet_subnet_id(
        self, network_name: str, subnet: str, subnet_id: int
    ) -> List[str]:
        """Get command path for subnet-id (version-aware, 1.5 only)."""
        if hasattr(self.version_mapper, "get_subnet_subnet_id"):
            return self.version_mapper.get_subnet_subnet_id(
                network_name, subnet, subnet_id
            )
        # For 1.4, return empty path (will be ignored by builder)
        return []

    def get_subnet_subnet_id_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        """Get command path for subnet-id deletion (version-aware, 1.5 only)."""
        if hasattr(self.version_mapper, "get_subnet_subnet_id_path"):
            return self.version_mapper.get_subnet_subnet_id_path(network_name, subnet)
        # For 1.4, return empty path (will be ignored by builder)
        return []

    def has_subnet_id(self) -> bool:
        """Check if this version supports subnet-id."""
        return self.version_mapper.has_subnet_id()

    def can_clear_inactive_leases(self) -> bool:
        """Whether operational lease clear works for non-active states."""
        return self.version_mapper.can_clear_inactive_leases()
