"""Factory for version-specific QoS mappers."""
from ..qos import QoSMapper
from .v1_4 import QoSMapperV1_4
from .v1_5 import QoSMapperV1_5


def get_qos_mapper(version: str):
    """Return a version-merged QoS mapper."""
    base = QoSMapper(version)

    if "1.4" in version:
        version_specific = QoSMapperV1_4()
    else:
        version_specific = QoSMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
