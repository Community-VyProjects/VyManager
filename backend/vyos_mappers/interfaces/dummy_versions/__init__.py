"""
Dummy Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..dummy import DummyInterfaceMapper
from .v1_5 import DummyMapper_v1_5


def get_dummy_mapper(version: str) -> DummyInterfaceMapper:
    """Return the dummy interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return DummyInterfaceMapper(version)
    return DummyMapper_v1_5(version)


__all__ = ["DummyMapper_v1_5", "get_dummy_mapper"]
