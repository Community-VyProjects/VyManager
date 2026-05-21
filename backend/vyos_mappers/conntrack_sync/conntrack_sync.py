"""Conntrack-Sync Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "conntrack-sync"]


class ConntrackSyncMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Top-level paths
    # ========================================================================

    def get_conntrack_sync_delete(self) -> List[str]:
        return BASE

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
