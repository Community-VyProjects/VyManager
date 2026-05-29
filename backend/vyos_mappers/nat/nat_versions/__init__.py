"""NAT mapper version factory."""
from ..nat import NATMapper


def get_nat_mapper(version: str) -> NATMapper:
    """Factory to get version-specific NAT mapper."""
    if "1.4" in version:
        from .v1_4 import NATMapper_v1_4
        return NATMapper_v1_4(version)
    else:
        from .v1_5 import NATMapper_v1_5
        return NATMapper_v1_5(version)
