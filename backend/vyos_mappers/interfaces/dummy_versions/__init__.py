"""
Dummy Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..dummy import DummyInterfaceMapper
from .v1_4 import DummyMapper_v1_4
from .v1_5 import DummyMapper_v1_5


def get_dummy_mapper(version: str) -> DummyInterfaceMapper:
    """Get version-specific dummy interface mapper."""
    if not is_vyos_1_4(version):
        return DummyMapper_v1_5(version)
    return DummyMapper_v1_4(version)
