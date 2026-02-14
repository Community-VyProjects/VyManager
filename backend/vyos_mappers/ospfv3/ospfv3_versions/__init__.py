"""Factory for version-specific OSPFv3 protocol mappers.

OSPFv3 has no version differences between VyOS 1.4 and 1.5,
but we follow the standard version-aware mapper pattern for consistency.
"""
from ..ospfv3 import Ospfv3Mapper
from .v1_4 import Ospfv3MapperV1_4
from .v1_5 import Ospfv3MapperV1_5


def get_ospfv3_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = Ospfv3Mapper(version)

    if "1.4" in version:
        version_specific = Ospfv3MapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = Ospfv3MapperV1_5()
    else:
        version_specific = Ospfv3MapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
