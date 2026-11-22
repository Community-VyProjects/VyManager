"""VyOS 1.5 local route mapper.

1.5 adds ``set vrf`` under local-route and local-route6 rules. Path methods
do not re-check the node: the builder already called ``require_node``.
"""

from typing import List

from ..local_route import LocalRouteMapper


class LocalRouteMapperV1_5(LocalRouteMapper):
    """VyOS 1.5 local route mapper."""

    def get_local_route_rule_set_vrf(self, rule_number: int, vrf: str) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "set", "vrf"]

    def get_local_route6_rule_set_vrf(self, rule_number: int, vrf: str) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route6_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf"]
