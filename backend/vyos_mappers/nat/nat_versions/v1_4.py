"""NAT mapper for VyOS 1.4."""
from typing import List

from ..nat import NATMapper

_CGNAT_UNSUPPORTED = "CGNAT requires VyOS 1.5+. Current device is running v1.4"


class NATMapper_v1_4(NATMapper):
    """NAT mapper for VyOS 1.4.

    Source, destination and static NAT are fully supported. CGNAT
    (``nat cgnat ...``) only exists from VyOS 1.5, so every CGNAT path
    raises here — mirroring the firewall groups v1_4 mapper — instead of
    emitting a path the device would reject at commit.
    """

    def get_cgnat_log_allocation(self) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external(self, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_port_range(self, pool_name: str, port_range: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_port_range_path(self, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_per_user_limit_port(self, pool_name: str, port: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_per_user_limit_port_path(self, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_range(self, pool_name: str, ip_range: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_range_seq(self, pool_name: str, ip_range: str, seq: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_external_range_seq_path(self, pool_name: str, ip_range: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_internal(self, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_internal_range(self, pool_name: str, ip_range: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_pool_internal_range_path(self, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_rule(self, rule_number: int) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_rule_source_pool(self, rule_number: int, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_rule_source_pool_path(self, rule_number: int) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_rule_translation_pool(self, rule_number: int, pool_name: str) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)

    def get_cgnat_rule_translation_pool_path(self, rule_number: int) -> List[str]:
        raise ValueError(_CGNAT_UNSUPPORTED)
