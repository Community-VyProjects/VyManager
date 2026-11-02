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
        # parse_config must live here. A method on the base class is bound to
        # `base`, so version-specific lookup would not see this instance.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_qos_config

            return parse_qos_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
