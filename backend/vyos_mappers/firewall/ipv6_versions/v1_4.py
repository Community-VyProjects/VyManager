"""
VyOS 1.4 specific IPv6 firewall commands.

Handles version-specific differences in command syntax for VyOS 1.4.
VyOS 1.4 uses 'ipsec/match-ipsec' and 'ipsec/match-none' without direction suffix.
"""

from typing import List


class FirewallIPv6MapperV1_4:
    """Version-specific mapper for VyOS 1.4 IPv6 firewall."""

    # ========================================================================
    # IPsec Matching (VyOS 1.4 - no direction suffix)
    # ========================================================================

    def get_rule_ipsec_match_ipsec(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec (VyOS 1.4)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec"]

    def get_rule_ipsec_match_ipsec_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec"]

    def get_rule_ipsec_match_none(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none (VyOS 1.4)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "ipsec", "match-none"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "ipsec", "match-none"]

    def get_rule_ipsec_match_none_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "ipsec", "match-none"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "ipsec", "match-none"]

    def get_rule_ipsec_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec node (for deleting entire ipsec node)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "ipsec"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "ipsec"]
