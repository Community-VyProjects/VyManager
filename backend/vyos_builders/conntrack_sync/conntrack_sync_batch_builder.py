"""
Conntrack-Sync Service Batch Builder

Generates VyOS set/delete operations for the conntrack-sync service.

Configuration lives under: service conntrack-sync

Structure:
  service conntrack-sync
    accept-protocol [tcp|udp|icmp|icmp6|sctp|dccp]  # multi-value
    disable-external-cache                            # presence flag
    disable-syslog                                    # presence flag
    event-listen-queue-size <u32>                     # default: 8 MB
    expect-sync [all|ftp|sip|h323|nfs|sqlnet]         # multi-value
    failover-mechanism
      vrrp
        sync-group <name>
    ignore-address <ipv4|ipv6|prefix>                 # multi-value
    interface <name>
      peer <ipv4>
      port <1-65535>
    listen-address <ipv4>                             # multi-value
    mcast-group <ipv4-multicast>                      # default: 225.0.0.50
    startup-resync                                    # presence flag
    sync-queue-size <u32>                             # default: 1 MB

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ConntrackSyncBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["conntrack_sync"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "ConntrackSyncBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ConntrackSyncBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "conntrack_sync": {
                    "supported": True,
                    "description": "Connection tracking synchronization service",
                },
                "accept_protocol": {
                    "supported": True,
                    "description": "Protocols to sync conntrack entries for",
                    "options": ["tcp", "udp", "icmp", "icmp6", "sctp", "dccp"],
                },
                "disable_external_cache": {
                    "supported": True,
                    "description": "Directly inject flow-states into kernel connection tracking",
                },
                "disable_syslog": {
                    "supported": True,
                    "description": "Disable connection logging via syslog",
                },
                "event_listen_queue_size": {
                    "supported": True,
                    "description": "Queue size (MB) for local conntrack events",
                    "default": 8,
                },
                "expect_sync": {
                    "supported": True,
                    "description": "Protocols for which expect entries are synchronized",
                    "options": ["all", "ftp", "sip", "h323", "nfs", "sqlnet"],
                },
                "failover_vrrp": {
                    "supported": True,
                    "description": "Use VRRP sync-group as failover mechanism",
                },
                "ignore_address": {
                    "supported": True,
                    "description": "IP addresses/prefixes excluded from sync",
                },
                "interface": {
                    "supported": True,
                    "description": "Interface used for syncing conntrack entries",
                },
                "interface_peer": {
                    "supported": True,
                    "description": "Unicast peer IPv4 address per interface (disables multicast)",
                },
                "interface_port": {
                    "supported": True,
                    "description": "UDP port number per interface (1–65535)",
                },
                "listen_address": {
                    "supported": True,
                    "description": "Local IPv4 addresses to listen on",
                },
                "mcast_group": {
                    "supported": True,
                    "description": "Multicast group for syncing conntrack entries",
                    "default": "225.0.0.50",
                },
                "startup_resync": {
                    "supported": True,
                    "description": "Request full conntrack table resync at startup",
                },
                "sync_queue_size": {
                    "supported": True,
                    "description": "Queue size (MB) for syncing conntrack entries",
                    "default": 1,
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Top-level delete
    # -----------------------------------------------------------------------

    def delete_conntrack_sync(self) -> "ConntrackSyncBatchBuilder":
        """Delete the entire conntrack-sync configuration."""
        return self.add_delete(self.m.get_conntrack_sync_delete())

    # -----------------------------------------------------------------------
    # accept-protocol (multi-value)
    # -----------------------------------------------------------------------

    def set_accept_protocol(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_accept_protocol(protocol))

    def delete_accept_protocol(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_accept_protocol_delete(protocol))

    def delete_accept_protocols(self) -> "ConntrackSyncBatchBuilder":
        """Remove all accept-protocol entries."""
        return self.add_delete(self.m.get_accept_protocols_delete())

    # -----------------------------------------------------------------------
    # disable-external-cache (presence flag)
    # -----------------------------------------------------------------------

    def set_disable_external_cache(self) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_disable_external_cache())

    def delete_disable_external_cache(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_disable_external_cache())

    # -----------------------------------------------------------------------
    # disable-syslog (presence flag)
    # -----------------------------------------------------------------------

    def set_disable_syslog(self) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_disable_syslog())

    def delete_disable_syslog(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_disable_syslog())

    # -----------------------------------------------------------------------
    # event-listen-queue-size
    # -----------------------------------------------------------------------

    def set_event_listen_queue_size(self, size: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_event_listen_queue_size(size))

    def delete_event_listen_queue_size(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_event_listen_queue_size_delete())

    # -----------------------------------------------------------------------
    # expect-sync (multi-value)
    # -----------------------------------------------------------------------

    def set_expect_sync(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_expect_sync(protocol))

    def delete_expect_sync(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_expect_sync_delete(protocol))

    def delete_expect_syncs(self) -> "ConntrackSyncBatchBuilder":
        """Remove all expect-sync entries."""
        return self.add_delete(self.m.get_expect_syncs_delete())

    # -----------------------------------------------------------------------
    # failover-mechanism vrrp
    # -----------------------------------------------------------------------

    def set_failover_vrrp_sync_group(self, group: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_failover_vrrp_sync_group(group))

    def delete_failover_vrrp_sync_group(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_failover_vrrp_sync_group_delete())

    def delete_failover_mechanism(self) -> "ConntrackSyncBatchBuilder":
        """Remove the entire failover-mechanism configuration."""
        return self.add_delete(self.m.get_failover_mechanism_delete())

    # -----------------------------------------------------------------------
    # ignore-address (multi-value)
    # -----------------------------------------------------------------------

    def set_ignore_address(self, address: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_ignore_address(address))

    def delete_ignore_address(self, address: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_ignore_address_delete(address))

    def delete_ignore_addresses(self) -> "ConntrackSyncBatchBuilder":
        """Remove all ignore-address entries."""
        return self.add_delete(self.m.get_ignore_addresses_delete())

    # -----------------------------------------------------------------------
    # interface (tagged node)
    # -----------------------------------------------------------------------

    def set_interface(self, interface: str) -> "ConntrackSyncBatchBuilder":
        """Create or touch an interface node."""
        return self.add_set(self.m.get_interface(interface))

    def delete_interface(self, interface: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(interface))

    def delete_interfaces(self) -> "ConntrackSyncBatchBuilder":
        """Remove all interface nodes."""
        return self.add_delete(self.m.get_interfaces_delete())

    def set_interface_peer(self, interface: str, peer: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_interface_peer(interface, peer))

    def delete_interface_peer(self, interface: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_interface_peer_delete(interface))

    def set_interface_port(self, interface: str, port: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_interface_port(interface, port))

    def delete_interface_port(self, interface: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_interface_port_delete(interface))

    # -----------------------------------------------------------------------
    # listen-address (multi-value)
    # -----------------------------------------------------------------------

    def set_listen_address(self, address: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(address))

    def delete_listen_addresses(self) -> "ConntrackSyncBatchBuilder":
        """Remove all listen-address entries."""
        return self.add_delete(self.m.get_listen_addresses_delete())

    # -----------------------------------------------------------------------
    # mcast-group
    # -----------------------------------------------------------------------

    def set_mcast_group(self, group: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_mcast_group(group))

    def delete_mcast_group(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_mcast_group_delete())

    # -----------------------------------------------------------------------
    # startup-resync (presence flag)
    # -----------------------------------------------------------------------

    def set_startup_resync(self) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_startup_resync())

    def delete_startup_resync(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_startup_resync())

    # -----------------------------------------------------------------------
    # sync-queue-size
    # -----------------------------------------------------------------------

    def set_sync_queue_size(self, size: str) -> "ConntrackSyncBatchBuilder":
        return self.add_set(self.m.get_sync_queue_size(size))

    def delete_sync_queue_size(self) -> "ConntrackSyncBatchBuilder":
        return self.add_delete(self.m.get_sync_queue_size_delete())
