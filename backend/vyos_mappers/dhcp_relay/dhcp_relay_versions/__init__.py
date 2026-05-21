"""Factory for version-specific DHCP Relay mappers."""
from ..dhcp_relay import DHCPRelayMapper
from .v1_4 import DHCPRelayMapperV1_4
from .v1_5 import DHCPRelayMapperV1_5


def get_dhcp_relay_mapper(version: str):
    """Return a version-merged DHCP Relay mapper."""
    base = DHCPRelayMapper(version)

    if "1.4" in version:
        version_specific = DHCPRelayMapperV1_4()
    else:
        version_specific = DHCPRelayMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
