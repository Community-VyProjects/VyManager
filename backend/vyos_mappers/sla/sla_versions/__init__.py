"""Factory for version-specific SLA mappers."""
from ..sla import SLAMapper
from .v1_4 import SLAMapperV1_4
from .v1_5 import SLAMapperV1_5


def get_sla_mapper(version: str):
    """Return a version-merged SLA mapper."""
    base = SLAMapper(version)

    if "1.4" in version:
        version_specific = SLAMapperV1_4()
    else:
        version_specific = SLAMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
