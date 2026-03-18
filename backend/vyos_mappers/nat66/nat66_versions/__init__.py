"""NAT66 mapper version factory."""
from ..nat66 import NAT66Mapper


def get_nat66_mapper(version: str) -> NAT66Mapper:
    """Factory to get version-specific NAT66 mapper.

    VyOS 1.5 adds firewall group support (source/destination group subtree)
    on both source and destination rules.
    """
    if "1.5" in version:
        from .v1_5 import NAT66Mapper_v1_5
        return NAT66Mapper_v1_5(version)
    else:
        from .v1_4 import NAT66Mapper_v1_4
        return NAT66Mapper_v1_4(version)
