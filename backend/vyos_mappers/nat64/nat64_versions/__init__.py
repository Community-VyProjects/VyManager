"""NAT64 mapper version factory."""
from ..nat64 import NAT64Mapper


def get_nat64_mapper(version: str) -> NAT64Mapper:
    """Factory to get version-specific NAT64 mapper."""
    if version == "1.4":
        from .v1_4 import NAT64Mapper_v1_4
        return NAT64Mapper_v1_4(version)
    elif version == "1.5":
        from .v1_5 import NAT64Mapper_v1_5
        return NAT64Mapper_v1_5(version)
    else:
        raise ValueError(f"Unsupported VyOS version: {version}")
