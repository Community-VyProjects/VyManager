"""Conntrack-Sync Service Command Mapper.

One class holds the commands both VyOS versions have. ``purge-timeout`` and
IPv6 peer, listen and multicast addresses exist only on 1.5; those live on
``conntrack_sync_versions.v1_5.ConntrackSyncMapperV1_5``.
"""
from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper

BASE = ["service", "conntrack-sync"]

# Lab `allowed:` lines, the same on 1.4 and 1.5.
ACCEPT_PROTOCOLS = ["tcp", "udp", "icmp", "icmp6", "sctp", "dccp"]
EXPECT_SYNC_PROTOCOLS = ["all", "ftp", "sip", "h323", "nfs", "sqlnet"]


class ConntrackSyncMapper(BaseFeatureMapper):
    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Conntrack-sync nodes only some VyOS versions have.

        Each one has its path methods on the version subclass. Capabilities
        and the builder read this set instead of the version string.
        """
        nodes = []
        if callable(getattr(self, "get_purge_timeout", None)):
            nodes.append("purge-timeout")
        return frozenset(nodes)

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"conntrack-sync {node} is not supported on this device")

    # ========================================================================
    # Value lists
    # ========================================================================

    def accept_protocol_values(self) -> List[str]:
        return list(ACCEPT_PROTOCOLS)

    def expect_sync_values(self) -> List[str]:
        return list(EXPECT_SYNC_PROTOCOLS)

    def address_families(self) -> List[str]:
        """Address families interface peer, listen-address and mcast-group accept."""
        return ["ipv4"]

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_conntrack_sync_config

        return parse_conntrack_sync_config(self, full_config)

    # ========================================================================
    # Top-level paths
    # ========================================================================

    def get_conntrack_sync_delete(self) -> List[str]:
        return list(BASE)

    # ========================================================================
    # accept-protocol (multi-value)
    # ========================================================================

    def get_accept_protocol(self, protocol: str) -> List[str]:
        return BASE + ["accept-protocol", protocol]

    def get_accept_protocol_delete(self, protocol: str) -> List[str]:
        return BASE + ["accept-protocol", protocol]

    def get_accept_protocols_delete(self) -> List[str]:
        return BASE + ["accept-protocol"]

    # ========================================================================
    # disable-external-cache (presence flag)
    # ========================================================================

    def get_disable_external_cache(self) -> List[str]:
        return BASE + ["disable-external-cache"]

    # ========================================================================
    # disable-syslog (presence flag)
    # ========================================================================

    def get_disable_syslog(self) -> List[str]:
        return BASE + ["disable-syslog"]

    # ========================================================================
    # event-listen-queue-size
    # ========================================================================

    def get_event_listen_queue_size(self, size: str) -> List[str]:
        return BASE + ["event-listen-queue-size", size]

    def get_event_listen_queue_size_delete(self) -> List[str]:
        return BASE + ["event-listen-queue-size"]

    # ========================================================================
    # expect-sync (multi-value)
    # ========================================================================

    def get_expect_sync(self, protocol: str) -> List[str]:
        return BASE + ["expect-sync", protocol]

    def get_expect_sync_delete(self, protocol: str) -> List[str]:
        return BASE + ["expect-sync", protocol]

    def get_expect_syncs_delete(self) -> List[str]:
        return BASE + ["expect-sync"]

    # ========================================================================
    # failover-mechanism vrrp sync-group
    # ========================================================================

    def get_failover_vrrp_sync_group(self, group: str) -> List[str]:
        return BASE + ["failover-mechanism", "vrrp", "sync-group", group]

    def get_failover_vrrp_sync_group_delete(self) -> List[str]:
        return BASE + ["failover-mechanism", "vrrp", "sync-group"]

    def get_failover_mechanism_delete(self) -> List[str]:
        return BASE + ["failover-mechanism"]

    # ========================================================================
    # ignore-address (multi-value)
    # ========================================================================

    def get_ignore_address(self, address: str) -> List[str]:
        return BASE + ["ignore-address", address]

    def get_ignore_address_delete(self, address: str) -> List[str]:
        return BASE + ["ignore-address", address]

    def get_ignore_addresses_delete(self) -> List[str]:
        return BASE + ["ignore-address"]

    # ========================================================================
    # interface/<name>
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interfaces_delete(self) -> List[str]:
        return BASE + ["interface"]

    # interface/<name>/peer
    def get_interface_peer(self, interface: str, peer: str) -> List[str]:
        return BASE + ["interface", interface, "peer", peer]

    def get_interface_peer_delete(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "peer"]

    # interface/<name>/port
    def get_interface_port(self, interface: str, port: str) -> List[str]:
        return BASE + ["interface", interface, "port", port]

    def get_interface_port_delete(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "port"]

    # ========================================================================
    # listen-address (multi-value)
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_addresses_delete(self) -> List[str]:
        return BASE + ["listen-address"]

    # ========================================================================
    # mcast-group
    # ========================================================================

    def get_mcast_group(self, group: str) -> List[str]:
        return BASE + ["mcast-group", group]

    def get_mcast_group_delete(self) -> List[str]:
        return BASE + ["mcast-group"]

    # ========================================================================
    # startup-resync (presence flag)
    # ========================================================================

    def get_startup_resync(self) -> List[str]:
        return BASE + ["startup-resync"]

    # ========================================================================
    # sync-queue-size
    # ========================================================================

    def get_sync_queue_size(self, size: str) -> List[str]:
        return BASE + ["sync-queue-size", size]

    def get_sync_queue_size_delete(self) -> List[str]:
        return BASE + ["sync-queue-size"]
