"""NAT mapper version factory."""
from ...base import is_vyos_1_4
from ..nat import NATMapper


def get_nat_mapper(version: str) -> NATMapper:
    """Factory to get version-specific NAT mapper."""
    if is_vyos_1_4(version):
        from .v1_4 import NATMapper_v1_4
        return NATMapper_v1_4(version)
    else:
        from .v1_5 import NATMapper_v1_5
        return NATMapper_v1_5(version)
