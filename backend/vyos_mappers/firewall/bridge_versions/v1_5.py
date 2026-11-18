"""VyOS 1.5 bridge firewall mapper.

1.5 adds input, output, and prerouting, plus the rule nodes the shared
class treats as absent. Path methods stay on the shared class and ask
``has_rule_node`` before they emit a path.
"""

from typing import List

from ..bridge import (
    BridgeFirewallMapper,
    _BASE_CHAINS_V15,
    _PREROUTING_RULE_ACTIONS_V15,
    _RULE_ACTIONS,
)


class BridgeFirewallMapperV1_5(BridgeFirewallMapper):
    """Bridge firewall mapper for VyOS 1.5 and rolling."""

    def get_supported_chains(self) -> List[str]:
        return list(_BASE_CHAINS_V15)

    def get_supported_rule_actions(self, chain: str) -> List[str]:
        if chain == "prerouting":
            return list(_PREROUTING_RULE_ACTIONS_V15)
        return list(_RULE_ACTIONS)

    def has_rule_node(self, *tail: str) -> bool:
        return True
