"""Factory for RIP protocol mappers.

The shared class is returned directly on 1.4. ``protocols rip redistribute
nhrp`` exists only on 1.5, so that version gets the subclass.
"""

from ..rip import RipMapper
from .v1_5 import RipMapperV1_5


def get_rip_mapper(version: str) -> RipMapper:
    """Return the RIP mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return RipMapper(version)
    return RipMapperV1_5(version)
