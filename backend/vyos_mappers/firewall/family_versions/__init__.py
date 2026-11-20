"""Factory for version-specific firewall family mappers."""

from ...base import is_vyos_1_4
from ..family import FirewallFamilyMapper
from .v1_4 import FirewallFamilyMapperV1_4
from .v1_5 import FirewallFamilyMapperV1_5


def get_firewall_family_mapper(version: str, family: str):
    """Return a merged mapper for version and address family."""
    base = FirewallFamilyMapper(version, family)

    if is_vyos_1_4(version):
        version_specific = FirewallFamilyMapperV1_4(family)
    else:
        version_specific = FirewallFamilyMapperV1_5(family)

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()


def get_firewall_ipv4_mapper(version: str):
    return get_firewall_family_mapper(version, "ipv4")


def get_firewall_ipv6_mapper(version: str):
    return get_firewall_family_mapper(version, "ipv6")
