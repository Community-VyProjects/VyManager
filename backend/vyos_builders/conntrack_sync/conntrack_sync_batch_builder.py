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
      peer <ipv4|ipv6>                                # ipv6 on 1.5
      port <1-65535>
    listen-address <ipv4|ipv6>                        # multi-value; ipv6 on 1.5
    mcast-group <ipv4-multicast|ipv6-multicast>       # default: 225.0.0.50; ipv6 on 1.5
    purge-timeout <1-2147483647>                      # 1.5 only
    startup-resync                                    # presence flag
    sync-queue-size <u32>                             # default: 1 MB

The mapper allowlist (versioned_nodes) decides which version-only leaves
this device has. Multi-argument batch operations encode compound values as
"arg1,arg2" (comma-separated), matching the project's standard batch
dispatch pattern.
"""

from typing import Dict, Any, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.conntrack_sync.conntrack_sync import ConntrackSyncMapper
from vyos_builders.base import BatchBuilder

# Lab val_help bounds, the same on 1.4 and 1.5.
U32_RANGE = {"min": 0, "max": 4294967295}
PORT_RANGE = {"min": 1, "max": 65535}
PURGE_TIMEOUT_RANGE = {"min": 1, "max": 2147483647}


class ConntrackSyncBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.m = cast(
            ConntrackSyncMapper, CommandMapperRegistry.get_mapper("conntrack_sync", version)
        )

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        nodes = self.m.versioned_nodes()
        families = self.m.address_families()

        return {
            "version": self.version,
            "features": {
                "accept_protocol": {
                    "supported": True,
                    "options": self.m.accept_protocol_values(),
                },
                "disable_external_cache": {"supported": True},
                "disable_syslog": {"supported": True},
                "event_listen_queue_size": {"supported": True, "default": 8, **U32_RANGE},
                "expect_sync": {
                    "supported": True,
                    "options": self.m.expect_sync_values(),
                },
                "failover_vrrp": {"supported": True},
                "ignore_address": {"supported": True},
                "interface": {"supported": True},
                "interface_peer": {"supported": True, "families": families},
                "interface_port": {"supported": True, **PORT_RANGE},
                "listen_address": {"supported": True, "families": families},
                "mcast_group": {
                    "supported": True,
                    "default": "225.0.0.50",
                    "families": families,
                },
                "purge_timeout": {"supported": "purge-timeout" in nodes, **PURGE_TIMEOUT_RANGE},
                "startup_resync": {"supported": True},
                "sync_queue_size": {"supported": True, "default": 1, **U32_RANGE},
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
    # purge-timeout (1.5 only)
    # -----------------------------------------------------------------------

    def set_purge_timeout(self, timeout: str) -> "ConntrackSyncBatchBuilder":
        self.m.require_node("purge-timeout")
        return self.add_set(getattr(self.m, "get_purge_timeout")(timeout))

    def delete_purge_timeout(self) -> "ConntrackSyncBatchBuilder":
        self.m.require_node("purge-timeout")
        return self.add_delete(getattr(self.m, "get_purge_timeout_delete")())

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
