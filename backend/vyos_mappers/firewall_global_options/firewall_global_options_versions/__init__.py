"""Factory for firewall global-options mappers.

The shared class is returned directly on 1.4. ``apply-to-bridged-traffic``,
``geoip``, ``state-policy offload`` and ``timeout`` exist only on 1.5, so
that version gets the subclass. There is no merge proxy and no 1.4 file.
"""
from ..firewall_global_options import FirewallGlobalOptionsMapper
from .v1_5 import FirewallGlobalOptionsMapperV1_5


def get_firewall_global_options_mapper(version: str) -> FirewallGlobalOptionsMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return FirewallGlobalOptionsMapper(version)
    return FirewallGlobalOptionsMapperV1_5(version)


__all__ = ["FirewallGlobalOptionsMapperV1_5", "get_firewall_global_options_mapper"]
