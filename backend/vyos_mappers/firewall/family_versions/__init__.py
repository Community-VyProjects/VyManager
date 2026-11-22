"""Factory for the firewall ipv4/ipv6 mapper.

Only a string that contains ``1.4`` is 1.4; a rolling string is 1.5.
"""

from ...base import is_vyos_1_4
from ..family import FirewallFamilyMapper
from .v1_4 import FirewallFamilyMapperV1_4
from .v1_5 import FirewallFamilyMapperV1_5


def get_firewall_family_mapper(version: str, family: str) -> FirewallFamilyMapper:
    """Return the firewall mapper for this device and address family."""
    if is_vyos_1_4(version):
        return FirewallFamilyMapperV1_4(version, family)
    return FirewallFamilyMapperV1_5(version, family)


def get_firewall_ipv4_mapper(version: str) -> FirewallFamilyMapper:
    return get_firewall_family_mapper(version, "ipv4")


def get_firewall_ipv6_mapper(version: str) -> FirewallFamilyMapper:
    return get_firewall_family_mapper(version, "ipv6")
