"""Factory for Babel protocol mappers.

The shared class is returned directly on 1.4. ``protocols babel redistribute
ipv4 nhrp`` and ``ipv6 nhrp`` exist only on 1.5, so that version gets the
subclass.
"""

from ...base import is_vyos_1_4
from ..babel import BabelMapper
from .v1_5 import BabelMapperV1_5


def get_babel_mapper(version: str) -> BabelMapper:
    """Return the Babel mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if is_vyos_1_4(version):
        return BabelMapper(version)
    return BabelMapperV1_5(version)
