"""Factory for version-specific DHCPv6 Relay mappers."""
from ..dhcpv6_relay import DHCPv6RelayMapper
from .v1_4 import DHCPv6RelayMapperV1_4
from .v1_5 import DHCPv6RelayMapperV1_5


def get_dhcpv6_relay_mapper(version: str):
    """Return a version-merged DHCPv6 Relay mapper."""
    base = DHCPv6RelayMapper(version)

    if "1.4" in version:
        version_specific = DHCPv6RelayMapperV1_4()
    else:
        version_specific = DHCPv6RelayMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on DHCPv6RelayMapper is bound
        # to `base`, so mapper.version would not fall through on the call.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_dhcpv6_relay_config

            return parse_dhcpv6_relay_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
