"""VyOS 1.4 specific commands for local route policy."""

from typing import FrozenSet

from ..local_route import LocalRouteMapper


class LocalRouteMapperV1_4(LocalRouteMapper):
    """Version-specific mapper for VyOS 1.4.

    1.4 has no ``set vrf`` under local-route or local-route6 rules, so those
    paths raise instead of emitting a path the device rejects at commit.
    """

    def versioned_rule_set_actions(self) -> FrozenSet[str]:
        return frozenset()
