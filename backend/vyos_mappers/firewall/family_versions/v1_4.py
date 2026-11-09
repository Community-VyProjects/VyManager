"""VyOS 1.4 firewall family mixin.

Non-directional IPsec match paths live on FirewallFamilyMapper and are gated
by has_rule_node. This class remains so the factory can still select a 1.4 mixin.
"""


class FirewallFamilyMapperV1_4:
    """Version-specific mixin for VyOS 1.4 firewall family."""

    def __init__(self, family: str):
        self.family = family
