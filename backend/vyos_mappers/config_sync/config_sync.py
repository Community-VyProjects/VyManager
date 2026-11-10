"""Config-Sync Service Command Mapper."""
from typing import FrozenSet, List
from ..base import BaseFeatureMapper

BASE = ["service", "config-sync"]

SECTION_SUBTYPES = {
    "interfaces": {
        "bonding", "bridge", "dummy", "ethernet", "geneve", "input", "l2tpv3",
        "loopback", "macsec", "openvpn", "pppoe", "pseudo-ethernet", "sstpc",
        "tunnel", "virtual-ethernet", "vti", "vxlan", "wireguard", "wireless", "wwan",
    },
    "protocols": {
        "babel", "bfd", "bgp", "failover", "igmp-proxy", "isis", "mpls", "nhrp",
        "ospf", "ospfv3", "pim", "pim6", "rip", "ripng", "rpki", "segment-routing", "static",
    },
    "qos": {"interface", "policy"},
    "service": {
        "console-server", "dhcp-relay", "dhcp-server", "dhcpv6-relay", "dhcpv6-server",
        "dns", "lldp", "mdns", "monitoring", "ndp-proxy", "ntp", "snmp", "tftp-server", "webproxy",
    },
    "system": {
        "conntrack", "flow-accounting", "option", "sflow", "static-host-mapping", "sysctl", "time-zone",
    },
}


class ConfigSyncMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def versioned_nodes(self) -> FrozenSet[str]:
        """1.5-only config-sync leaves this device has.

        Section system login lives on the 1.5 subclass as path methods.
        Capabilities and builders read this set instead of the version string.
        """
        nodes = []
        if callable(getattr(self, "get_section_system_login", None)):
            nodes.append("system_login")
        return frozenset(nodes)

    def _require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"config-sync {node} is not supported on this device")

    # ========================================================================
    # Service-level
    # ========================================================================

    def get_config_sync_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Mode
    # ========================================================================

    def get_mode(self, value: str) -> List[str]:
        return BASE + ["mode", value]

    def get_mode_delete(self) -> List[str]:
        return BASE + ["mode"]

    # ========================================================================
    # Secondary
    # ========================================================================

    def get_secondary_address(self, address: str) -> List[str]:
        return BASE + ["secondary", "address", address]

    def get_secondary_address_delete(self) -> List[str]:
        return BASE + ["secondary", "address"]

    def get_secondary_key(self, key: str) -> List[str]:
        return BASE + ["secondary", "key", key]

    def get_secondary_key_delete(self) -> List[str]:
        return BASE + ["secondary", "key"]

    def get_secondary_port(self, port: str) -> List[str]:
        return BASE + ["secondary", "port", port]

    def get_secondary_port_delete(self) -> List[str]:
        return BASE + ["secondary", "port"]

    def get_secondary_timeout(self, timeout: str) -> List[str]:
        return BASE + ["secondary", "timeout", timeout]

    def get_secondary_timeout_delete(self) -> List[str]:
        return BASE + ["secondary", "timeout"]

    # ========================================================================
    # Sections — top-level presence flags
    # ========================================================================

    def get_section(self, section_name: str) -> List[str]:
        return BASE + ["section", section_name]

    # ========================================================================
    # Sections — sub-level presence flags (interfaces, protocols, qos,
    #            service, system)
    # ========================================================================

    def get_section_sub(self, section_name: str, sub_name: str) -> List[str]:
        if sub_name not in SECTION_SUBTYPES.get(section_name, set()):
            raise ValueError(f"Unsupported config-sync section subtype: {section_name},{sub_name}")
        return BASE + ["section", section_name, sub_name]
