"""NAT mapper version factory."""
from ..nat import NATMapper


def get_nat_mapper(version: str) -> NATMapper:
    """Factory to get version-specific NAT mapper."""
    if version == "1.4":
        from .v1_4 import NATMapper_v1_4
        return NATMapper_v1_4(version)
    elif version == "1.5":
        from .v1_5 import NATMapper_v1_5
        return NATMapper_v1_5(version)
    else:
        raise ValueError(f"Unsupported VyOS version: {version}")
