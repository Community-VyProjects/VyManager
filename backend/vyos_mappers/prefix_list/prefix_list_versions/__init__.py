"""Factory for version-specific prefix-list mappers."""
from ...base import is_vyos_1_4
from ..prefix_list import PrefixListMapper
from .v1_4 import PrefixListMapperV1_4
from .v1_5 import PrefixListMapperV1_5


def get_prefix_list_mapper(version: str):
    """Factory function to get appropriate mapper for version."""
    base = PrefixListMapper(version)

    if is_vyos_1_4(version):
        version_specific = PrefixListMapperV1_4()
    else:
        version_specific = PrefixListMapperV1_5()  # Default to latest

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
