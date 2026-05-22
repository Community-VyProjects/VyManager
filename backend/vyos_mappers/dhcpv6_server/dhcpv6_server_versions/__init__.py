"""DHCPv6 Server mapper version factory."""
from .v1_4 import DHCPv6ServerMapperV1_4
from .v1_5 import DHCPv6ServerMapperV1_5


def get_dhcpv6_server_mapper(version: str):
    from ..dhcpv6_server import DHCPv6ServerMapper
    base = DHCPv6ServerMapper(version)
    version_specific = DHCPv6ServerMapperV1_4() if "1.4" in version else DHCPv6ServerMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()


__all__ = ["DHCPv6ServerMapperV1_4", "DHCPv6ServerMapperV1_5", "get_dhcpv6_server_mapper"]
