"""
Bonding Interface Mapper - VyOS 1.5

VyOS 1.5 adds support for:
- eapol (802.1X authentication)
- dhcpv6-options no-request-dns
- dhcpv6-options no-request-domain-name
- ipv6 address interface-identifier
"""

from typing import List
from ..bonding import BondingInterfaceMapper


class BondingMapper_v1_5(BondingInterfaceMapper):
    """VyOS 1.5 bonding interface mapper with additional features."""

    def __init__(self, version: str):
        super().__init__(version)

    # --- EAPoL (802.1X) - VyOS 1.5 only ---
    def get_eapol_ca_certificate(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["eapol", "ca-certificate", value]

    def get_eapol_ca_certificate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["eapol", "ca-certificate"]

    def get_eapol_certificate(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["eapol", "certificate", value]

    def get_eapol_certificate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["eapol", "certificate"]

    def get_eapol_passphrase(self, interface: str, value: str) -> List[str]:
        return self._base(interface) + ["eapol", "passphrase", value]

    def get_eapol_passphrase_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["eapol", "passphrase"]

    def get_eapol_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["eapol"]

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
