"""Factory for version-specific TFTP server mappers."""
from ..tftp_server import TFTPServerMapper
from .v1_4 import TFTPServerMapperV1_4
from .v1_5 import TFTPServerMapperV1_5


def get_tftp_server_mapper(version: str):
    """Return a version-merged TFTP server mapper."""
    base = TFTPServerMapper(version)

    if "1.4" in version:
        version_specific = TFTPServerMapperV1_4()
    else:
        version_specific = TFTPServerMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
