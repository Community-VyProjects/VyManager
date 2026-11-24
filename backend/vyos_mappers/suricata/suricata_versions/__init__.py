"""Factory for the Suricata mapper.

The shared class is returned on 1.4, where ``service suricata`` does not
exist. The 1.5 subclass holds the paths. A rolling string is 1.5. Only a
string that contains ``1.4`` is 1.4.
"""

from ..suricata import SuricataMapper
from .v1_5 import SuricataMapperV1_5


def get_suricata_mapper(version: str) -> SuricataMapper:
    """Return the shared mapper, or the 1.5 subclass."""
    if "1.4" in version:
        return SuricataMapper(version)
    return SuricataMapperV1_5(version)


__all__ = ["SuricataMapperV1_5", "get_suricata_mapper"]
