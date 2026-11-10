"""Factory for version-specific WireGuard mappers."""

from ..wireguard import WireGuardMapper
from .v1_4 import WireGuardMapperV1_4
from .v1_5 import WireGuardMapperV1_5


def get_wireguard_mapper(version: str) -> WireGuardMapper:
    """Return the WireGuard mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return WireGuardMapperV1_4(version)
    return WireGuardMapperV1_5(version)
