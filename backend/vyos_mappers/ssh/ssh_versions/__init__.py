"""Factory for version-specific SSH mappers."""
from ..ssh import SSHMapper
from .v1_4 import SSHMapperV1_4
from .v1_5 import SSHMapperV1_5


def get_ssh_mapper(version: str):
    """Return a version-merged SSH mapper."""
    base = SSHMapper(version)

    if "1.4" in version:
        version_specific = SSHMapperV1_4()
    else:
        version_specific = SSHMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on SSHMapper is bound to
        # `base`, so mapper.version would not fall through on the call.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_ssh_config

            return parse_ssh_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
