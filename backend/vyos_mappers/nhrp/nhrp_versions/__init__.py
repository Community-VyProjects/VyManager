"""
NHRP Mapper Factory

Returns a MergedMapper that resolves version-specific methods first,
then falls back to the base NhrpMapper for common paths.

VyOS 1.4 and 1.5 have significant differences in NHRP configuration:
- Authentication key name (cisco-authentication vs authentication)
- Hold time key name (holding-time vs holdtime)
- Map structure (flat vs tunnel-ip nested)
- 1.4-only: dynamic-map, non-caching, shortcut-destination, shortcut-target
- 1.5-only: nhs, mtu, network-id, registration-no-unique
"""

from ..nhrp import NhrpMapper
from .v1_4 import NhrpMapperV1_4
from .v1_5 import NhrpMapperV1_5


def get_nhrp_mapper(version: str):
    base = NhrpMapper(version)

    if "1.4" in version:
        version_specific = NhrpMapperV1_4()
    else:
        # Default to 1.5 for rolling/unknown versions
        version_specific = NhrpMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
