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
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
