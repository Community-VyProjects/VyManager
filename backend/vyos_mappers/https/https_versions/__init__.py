"""Factory for HTTPS mappers.

The shared class is returned directly on 1.4. 1.5 paths live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..https import HTTPSMapper
from .v1_5 import HTTPSMapperV1_5


def get_https_mapper(version: str) -> HTTPSMapper:
    """Return the HTTPS mapper for this device."""
    if "1.4" in version:
        return HTTPSMapper(version)
    return HTTPSMapperV1_5(version)
