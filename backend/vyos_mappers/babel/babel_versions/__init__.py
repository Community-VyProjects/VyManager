"""Factory for version-specific Babel protocol mappers."""

from ..babel import BabelMapper
from .v1_4 import BabelMapperV1_4
from .v1_5 import BabelMapperV1_5


def get_babel_mapper(version: str) -> BabelMapper:
    """Return the Babel mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return BabelMapperV1_4(version)
    return BabelMapperV1_5(version)
