"""Factory for version-specific DNS Forwarding mappers."""
from ..dns_forwarding import DNSForwardingMapper
from .v1_4 import DNSForwardingMapperV1_4
from .v1_5 import DNSForwardingMapperV1_5


def get_dns_forwarding_mapper(version: str):
    """Return a version-merged DNS Forwarding mapper."""
    base = DNSForwardingMapper(version)

    if "1.4" in version:
        version_specific = DNSForwardingMapperV1_4()
    else:
        version_specific = DNSForwardingMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
