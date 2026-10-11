"""Factory for version-specific Suricata mappers."""
from typing import Any

from ..suricata import SuricataMapper
from .v1_4 import SuricataMapperV1_4
from .v1_5 import SuricataMapperV1_5


def get_suricata_mapper(version: str) -> Any:
    """Return a version-merged Suricata mapper."""
    base = SuricataMapper(version)

    if "1.4" in version:
        version_specific = SuricataMapperV1_4()
    else:
        version_specific = SuricataMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
