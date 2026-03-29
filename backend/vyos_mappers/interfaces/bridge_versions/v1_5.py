"""
Bridge Interface Mapper - VyOS 1.5

VyOS 1.5 adds support for:
- member interface bpdu-guard
- member interface root-guard
- dhcpv6-options no-request-dns
- dhcpv6-options no-request-domain-name
- ipv6 address interface-identifier
"""

from typing import List, Dict, Any
from ..bridge import BridgeInterfaceMapper


class BridgeMapper_v1_5(BridgeInterfaceMapper):
    """VyOS 1.5 bridge interface mapper with additional features."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- Member interface guards - VyOS 1.5 only ---
    def get_member_interface_bpdu_guard(self, interface: str, member: str) -> List[str]:
        return self._base(interface) + ["member", "interface", member, "bpdu-guard"]

    def get_member_interface_root_guard(self, interface: str, member: str) -> List[str]:
        return self._base(interface) + ["member", "interface", member, "root-guard"]

    # --- DHCPv6 no-request-dns / no-request-domain-name - VyOS 1.5 only ---
    def get_dhcpv6_options_no_request_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-dns"]

    def get_dhcpv6_options_no_request_domain_name(self, interface: str) -> List[str]:
        return self._base(interface) + ["dhcpv6-options", "no-request-domain-name"]

    # --- IPv6 address interface-identifier - VyOS 1.5 only ---
    def get_ipv6_address_interface_identifier(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier", value]

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "interface-identifier"]

    # Override member parsing to include 1.5-only fields
    def _parse_members(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        members = super()._parse_members(config)
        member_config = config.get("member", {})
        if not isinstance(member_config, dict):
            return members
        iface_config = member_config.get("interface", {})
        if not isinstance(iface_config, dict):
            return members
        for member in members:
            member_data = iface_config.get(member["name"], {})
            if isinstance(member_data, dict):
                member["bpdu_guard"] = "bpdu-guard" in member_data
                member["root_guard"] = "root-guard" in member_data
        return members
