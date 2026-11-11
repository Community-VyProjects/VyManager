"""DHCP server mapper shared by every VyOS version.

Commands both lab template trees have live on this class. A command only one
version has lives on that version's subclass in ``dhcp_versions``.
"""
from typing import Any, Dict, FrozenSet, List, Sequence, Tuple
from ..base import BaseFeatureMapper
from .dhcp_catalog import catalog_payload, delete_path, set_path

# Container-level behavior leaves of the Kea dynamic-dns-update node.
DDNS_SCALAR_FIELDS: Tuple[str, ...] = (
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
)


class DHCPMapper(BaseFeatureMapper):
    """Shared mapper for ``service dhcp-server``."""

    # Set by each version subclass from its lab template tree.
    # 1.5 puts the per-scope options under ``option``; 1.4 has them directly.
    OPTION_PREFIX: Tuple[str, ...]
    # Static-mapping hardware address leaf name.
    MAC_LEAF: str
    # Key into the dhcp_catalog path tables.
    CATALOG_KEY: str
    # Whether the operational lease clear also clears non-active leases.
    CLEARS_INACTIVE_LEASES: bool

    # Leaves only one version has, keyed by CLI path below service dhcp-server,
    # mapped to the path method the version subclass defines for that leaf.
    _VERSIONED_NODES: Dict[str, str] = {
        "host-decl-name": "get_host_decl_name",
        "listen-interface": "get_listen_interface",
        "subnet-id": "get_subnet_subnet_id",
        "subnet disable": "get_subnet_disable",
        "subnet enable-failover": "get_subnet_enable_failover",
        "static-mapping duid": "get_static_mapping_duid",
        "static-mapping description": "get_static_mapping_description",
        "high-availability certificate": "get_failover_certificate",
        "high-availability ca-certificate": "get_failover_ca_certificate",
        "dynamic-dns-update": "get_dynamic_dns_update",
        "dynamic-dns-update send-updates": "get_ddns_send_updates",
        "dynamic-dns-update tsig-key": "get_ddns_tsig_key",
        "dynamic-dns-update forward-domain": "get_ddns_domain",
        "dynamic-dns-update reverse-domain": "get_ddns_domain",
        **{f"dynamic-dns-update {field}": "get_ddns_scalar" for field in DDNS_SCALAR_FIELDS},
        "client-class": "get_client_class",
    }

    # ==================== Core ====================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only leaves this device has.

        Each one is a path method on the version subclass. Capabilities and
        the builder read this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"{node} is not supported on this device")

    def catalog(self) -> Dict[str, Any]:
        return catalog_payload(self.CATALOG_KEY)

    def catalog_set(
        self,
        scope: str,
        token: str,
        anchors: Sequence[str],
        values: Sequence[str] = (),
    ) -> List[str]:
        return set_path(self.CATALOG_KEY, scope, token, anchors, values)

    def catalog_delete(
        self,
        scope: str,
        token: str,
        anchors: Sequence[str],
        values: Sequence[str] = (),
    ) -> List[str]:
        return delete_path(self.CATALOG_KEY, scope, token, anchors, values)

    def _subnet_option(self, network_name: str, subnet: str) -> List[str]:
        return self.get_subnet(network_name, subnet) + list(self.OPTION_PREFIX)

    def _network_option(self, network_name: str) -> List[str]:
        return self.get_shared_network(network_name) + list(self.OPTION_PREFIX)

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

    def get_dynamic_dns_update_path(self) -> List[str]:
        """Delete dynamic-dns-update: the 1.4 leaf or the whole 1.5 node."""
        return ["service", "dhcp-server", "dynamic-dns-update"]

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
        return self._network_option(network_name) + ["name-server", name_server]

    def get_shared_network_name_server_path(
        self, network_name: str, name_server: str
    ) -> List[str]:
        return self._network_option(network_name) + ["name-server", name_server]

    def get_shared_network_domain_name(
        self, network_name: str, domain_name: str
    ) -> List[str]:
        return self._network_option(network_name) + ["domain-name", domain_name]

    def get_shared_network_domain_name_path(self, network_name: str) -> List[str]:
        return self._network_option(network_name) + ["domain-name"]

    def get_shared_network_domain_search(
        self, network_name: str, domain_search: str
    ) -> List[str]:
        return self._network_option(network_name) + ["domain-search", domain_search]

    def get_shared_network_domain_search_path(
        self, network_name: str, domain_search: str
    ) -> List[str]:
        return self._network_option(network_name) + ["domain-search", domain_search]

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
        """Get command path for subnet exclude address."""
        return [
            "service", "dhcp-server", "shared-network-name", network_name,
            "subnet", subnet, "exclude", address
        ]

    def get_subnet_exclude_path(
        self, network_name: str, subnet: str, address: str
    ) -> List[str]:
        """Get command path for exclude address deletion."""
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
        return self.get_static_mapping(network_name, subnet, mapping_name) + [
            self.MAC_LEAF, mac_address,
        ]

    def get_static_mapping_mac_address_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        return self.get_static_mapping(network_name, subnet, mapping_name) + [self.MAC_LEAF]

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

    # ==================== Subnet Options ====================

    def get_subnet_default_router(
        self, network_name: str, subnet: str, router: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["default-router", router]

    def get_subnet_default_router_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["default-router"]

    def get_subnet_name_server(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["name-server", name_server]

    def get_subnet_name_server_path(
        self, network_name: str, subnet: str, name_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["name-server", name_server]

    def get_subnet_domain_name(
        self, network_name: str, subnet: str, domain_name: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["domain-name", domain_name]

    def get_subnet_domain_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["domain-name"]

    def get_subnet_domain_search(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["domain-search", domain_search]

    def get_subnet_domain_search_path(
        self, network_name: str, subnet: str, domain_search: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["domain-search", domain_search]

    def get_subnet_bootfile_name(
        self, network_name: str, subnet: str, bootfile: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["bootfile-name", bootfile]

    def get_subnet_bootfile_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["bootfile-name"]

    def get_subnet_bootfile_server(
        self, network_name: str, subnet: str, server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["bootfile-server", server]

    def get_subnet_bootfile_server_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["bootfile-server"]

    def get_subnet_tftp_server_name(
        self, network_name: str, subnet: str, tftp_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["tftp-server-name", tftp_server]

    def get_subnet_tftp_server_name_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["tftp-server-name"]

    def get_subnet_time_server(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["time-server", time_server]

    def get_subnet_time_server_path(
        self, network_name: str, subnet: str, time_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["time-server", time_server]

    def get_subnet_ntp_server(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["ntp-server", ntp_server]

    def get_subnet_ntp_server_path(
        self, network_name: str, subnet: str, ntp_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["ntp-server", ntp_server]

    def get_subnet_wins_server(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["wins-server", wins_server]

    def get_subnet_wins_server_path(
        self, network_name: str, subnet: str, wins_server: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["wins-server", wins_server]

    def get_subnet_time_offset(
        self, network_name: str, subnet: str, offset: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["time-offset", offset]

    def get_subnet_time_offset_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["time-offset"]

    def get_subnet_client_prefix_length(
        self, network_name: str, subnet: str, prefix_length: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + [
            "client-prefix-length", prefix_length,
        ]

    def get_subnet_client_prefix_length_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["client-prefix-length"]

    def get_subnet_wpad_url(
        self, network_name: str, subnet: str, url: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["wpad-url", url]

    def get_subnet_wpad_url_path(
        self, network_name: str, subnet: str
    ) -> List[str]:
        return self._subnet_option(network_name, subnet) + ["wpad-url"]

    # ==================== High Availability ====================

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
