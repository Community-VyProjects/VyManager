"""NAT64 mapper version factory."""
from ..nat64 import NAT64Mapper


def get_nat64_mapper(version: str) -> NAT64Mapper:
    """Factory to get version-specific NAT64 mapper."""
    if "1.4" in version:
        from .v1_4 import NAT64Mapper_v1_4
        return NAT64Mapper_v1_4(version)
    else:
        from .v1_5 import NAT64Mapper_v1_5
        return NAT64Mapper_v1_5(version)
