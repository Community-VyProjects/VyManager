"""Factory for version-specific IPSec mappers."""

from ...base import is_vyos_1_4
from ..ipsec import IPSecMapper
from .v1_5 import IPSecMapperV1_5


def get_ipsec_mapper(version: str) -> IPSecMapper:
    """Return the IPSec mapper for this device.

    Only a string that contains ``1.4`` is 1.4. A rolling string is 1.5.
    """
    if is_vyos_1_4(version):
        return IPSecMapper(version)
    return IPSecMapperV1_5(version)
