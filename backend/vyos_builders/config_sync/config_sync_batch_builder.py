"""
Config-Sync Service Batch Builder

Generates VyOS set/delete operations for the config-sync service.

Configuration lives under: service config-sync

Structure:
  service config-sync
    mode (load|set)               # Sync mode
    secondary                     # Secondary (target) router settings
      address <ip/hostname>
      key <api-key>
      port <1-65535>              # Default: 443
      timeout <1-3600>            # Default: 60
    section                       # Which config sections to sync
      firewall                    # Presence flag
      interfaces                  # Presence flag (or parent for subtypes)
        bonding | bridge | dummy | ethernet | geneve | input | l2tpv3
        loopback | macsec | openvpn | pppoe | pseudo-ethernet | sstpc
        tunnel | virtual-ethernet | vti | vxlan | wireguard | wireless | wwan
      nat | nat66 | pki | policy | vpn | vrf  # Presence flags
      protocols                   # Presence flag (or parent for subtypes)
        babel | bfd | bgp | failover | igmp-proxy | isis | mpls | nhrp
        ospf | ospfv3 | pim | pim6 | rip | ripng | rpki | segment-routing | static
      qos                         # Presence flag (or parent for subtypes)
        interface | policy
      service                     # Presence flag (or parent for subtypes)
        console-server | dhcp-relay | dhcp-server | dhcpv6-relay | dhcpv6-server
        dns | lldp | mdns | monitoring | ndp-proxy | ntp | snmp | tftp-server | webproxy
      system                      # Presence flag (or parent for subtypes)
        conntrack | flow-accounting | login | option | sflow
        static-host-mapping | sysctl | time-zone

The template structure is identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ConfigSyncBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["config_sync"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "ConfigSyncBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ConfigSyncBatchBuilder":
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
                "config_sync": {
                    "supported": True,
                    "description": "Primary/secondary configuration synchronization service",
                },
                "mode": {
                    "supported": True,
                    "description": "Synchronization mode: load (replace) or set (merge)",
                    "values": ["load", "set"],
                },
                "secondary": {
                    "supported": True,
                    "description": "Secondary router connection settings",
                },
                "sections": {
                    "supported": True,
                    "description": "Selectable config sections to synchronize",
                    "top_level": [
                        "firewall", "nat", "nat66", "pki", "policy", "vpn", "vrf",
                    ],
                    "with_subtypes": [
                        "interfaces", "protocols", "qos", "service", "system",
                    ],
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Service-level
    # -----------------------------------------------------------------------

    def delete_config_sync(self) -> "ConfigSyncBatchBuilder":
        """Delete the entire config-sync service configuration."""
        return self.add_delete(self.m.get_config_sync_delete())

    # -----------------------------------------------------------------------
    # Mode
    # -----------------------------------------------------------------------

    def set_mode(self, value: str) -> "ConfigSyncBatchBuilder":
        return self.add_set(self.m.get_mode(value))

    def delete_mode(self) -> "ConfigSyncBatchBuilder":
        return self.add_delete(self.m.get_mode_delete())

    # -----------------------------------------------------------------------
    # Secondary
    # -----------------------------------------------------------------------

    def set_secondary_address(self, address: str) -> "ConfigSyncBatchBuilder":
        return self.add_set(self.m.get_secondary_address(address))

    def delete_secondary_address(self) -> "ConfigSyncBatchBuilder":
        return self.add_delete(self.m.get_secondary_address_delete())

    def set_secondary_key(self, key: str) -> "ConfigSyncBatchBuilder":
        return self.add_set(self.m.get_secondary_key(key))

    def delete_secondary_key(self) -> "ConfigSyncBatchBuilder":
        return self.add_delete(self.m.get_secondary_key_delete())

    def set_secondary_port(self, port: str) -> "ConfigSyncBatchBuilder":
        return self.add_set(self.m.get_secondary_port(port))

    def delete_secondary_port(self) -> "ConfigSyncBatchBuilder":
        return self.add_delete(self.m.get_secondary_port_delete())

    def set_secondary_timeout(self, timeout: str) -> "ConfigSyncBatchBuilder":
        return self.add_set(self.m.get_secondary_timeout(timeout))

    def delete_secondary_timeout(self) -> "ConfigSyncBatchBuilder":
        return self.add_delete(self.m.get_secondary_timeout_delete())

    # -----------------------------------------------------------------------
    # Top-level sections (presence flags — no subtypes)
    # -----------------------------------------------------------------------

    def set_section(self, section_name: str) -> "ConfigSyncBatchBuilder":
        """Enable a top-level sync section (e.g. 'firewall', 'nat', 'vpn')."""
        return self.add_set(self.m.get_section(section_name))

    def delete_section(self, section_name: str) -> "ConfigSyncBatchBuilder":
        """Disable a top-level sync section."""
        return self.add_delete(self.m.get_section(section_name))

    # -----------------------------------------------------------------------
    # Sub-level sections (interfaces, protocols, qos, service, system)
    # -----------------------------------------------------------------------

    def set_section_sub(self, section_name: str, sub_name: str) -> "ConfigSyncBatchBuilder":
        """Enable a sub-section (e.g. section='interfaces', sub='ethernet')."""
        return self.add_set(self.m.get_section_sub(section_name, sub_name))

    def delete_section_sub(self, section_name: str, sub_name: str) -> "ConfigSyncBatchBuilder":
        """Disable a sub-section."""
        return self.add_delete(self.m.get_section_sub(section_name, sub_name))
