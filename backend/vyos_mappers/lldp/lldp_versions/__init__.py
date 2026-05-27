"""Factory for version-specific LLDP mappers."""
from ..lldp import LLDPMapper
from .v1_4 import LLDPMapperV1_4
from .v1_5 import LLDPMapperV1_5


def get_lldp_mapper(version: str):
    """Return a version-merged LLDP mapper."""
    base = LLDPMapper(version)

    if "1.4" in version:
        version_specific = LLDPMapperV1_4()
    else:
        version_specific = LLDPMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
