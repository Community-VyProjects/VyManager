"""VyOS 1.4 firewall ipv4/ipv6 mapper.

The non-directional ``ipsec match-ipsec`` and ``match-none`` leaves exist
only on 1.4. Path methods do not re-check the node: the builder already
called ``require_node``.
"""

from typing import FrozenSet, List

from ..family import FirewallFamilyMapper


class FirewallFamilyMapperV1_4(FirewallFamilyMapper):
    """Firewall ipv4/ipv6 mapper for VyOS 1.4."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({"ipsec-match"})

    # ========================================================================
    # Non-directional IPsec Match
    # ========================================================================

    def get_rule_ipsec_match_ipsec(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Non-directional IPsec match-ipsec."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec"]

    def get_rule_ipsec_match_ipsec_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Non-directional IPsec match-ipsec (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec"]

    def get_rule_ipsec_match_none(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Non-directional IPsec match-none."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none"]

    def get_rule_ipsec_match_none_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Non-directional IPsec match-none (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none"]
