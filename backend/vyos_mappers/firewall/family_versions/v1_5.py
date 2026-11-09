"""VyOS 1.5 firewall family mixin.

GRE, prerouting raw, and directional IPsec paths live on FirewallFamilyMapper
and are gated by has_rule_node. This class remains so the factory can still
select a 1.5 mixin.
"""


class FirewallFamilyMapperV1_5:
    """Version-specific mixin for VyOS 1.5 firewall family."""

    def __init__(self, family: str):
        self.family = family
