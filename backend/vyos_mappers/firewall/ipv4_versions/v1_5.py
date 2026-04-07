"""
VyOS 1.5 specific IPv4 firewall commands.

Handles version-specific differences in command syntax for VyOS 1.5.
VyOS 1.5 uses directional IPsec matching (in/out suffixes),
adds GRE matching support, and adds prerouting/raw chain support.
"""

from typing import List


class FirewallIPv4MapperV1_5:
    """Version-specific mapper for VyOS 1.5 IPv4 firewall."""

    # ========================================================================
    # IPsec Matching (VyOS 1.5 - directional with in/out suffix)
    # ========================================================================

    def get_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-in (VyOS 1.5)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-in"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec-in"]

    def get_rule_ipsec_match_ipsec_in_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-in (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-in"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec-in"]

    def get_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-out (VyOS 1.5)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-out"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec-out"]

    def get_rule_ipsec_match_ipsec_out_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-out (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-out"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-ipsec-out"]

    def get_rule_ipsec_match_none_in(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-in (VyOS 1.5)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-none-in"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-none-in"]

    def get_rule_ipsec_match_none_in_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-in (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-none-in"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-none-in"]

    def get_rule_ipsec_match_none_out(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-out (VyOS 1.5)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-none-out"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-none-out"]

    def get_rule_ipsec_match_none_out_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-out (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec", "match-none-out"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec", "match-none-out"]

    def get_rule_ipsec_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec node (for deleting entire ipsec node)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "ipsec"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "ipsec"]

    # ========================================================================
    # GRE Matching (VyOS 1.5 only)
    # ========================================================================

    def get_rule_gre_key(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE key value."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "key", value]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "key", value]

    def get_rule_gre_key_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE key (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "key"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "key"]

    def get_rule_gre_version(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE version value."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "version", value]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "version", value]

    def get_rule_gre_version_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE version (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "version"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "version"]

    def get_rule_gre_inner_proto(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE inner-proto value."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "inner-proto", value]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "inner-proto", value]

    def get_rule_gre_inner_proto_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE inner-proto (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "inner-proto"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "inner-proto"]

    def get_rule_gre_flags_checksum(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "checksum"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "checksum"]

    def get_rule_gre_flags_checksum_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "checksum"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "checksum"]

    def get_rule_gre_flags_checksum_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum unset."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "checksum", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "checksum", "unset"]

    def get_rule_gre_flags_checksum_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum unset (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "checksum", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "checksum", "unset"]

    def get_rule_gre_flags_key(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "key"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "key"]

    def get_rule_gre_flags_key_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "key"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "key"]

    def get_rule_gre_flags_key_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key unset."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "key", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "key", "unset"]

    def get_rule_gre_flags_key_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key unset (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "key", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "key", "unset"]

    def get_rule_gre_flags_sequence(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "sequence"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "sequence"]

    def get_rule_gre_flags_sequence_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "sequence"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "sequence"]

    def get_rule_gre_flags_sequence_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence unset."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "sequence", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "sequence", "unset"]

    def get_rule_gre_flags_sequence_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence unset (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre", "flags", "sequence", "unset"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre", "flags", "sequence", "unset"]

    def get_rule_gre_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE node (for deleting entire gre node)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "gre"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "gre"]

    # ========================================================================
    # Prerouting Raw Chain (VyOS 1.5 only)
    # ========================================================================

    def get_prerouting_raw_rule(self, rule_number: int) -> List[str]:
        """Get path for prerouting raw rule."""
        return ["firewall", "ipv4", "prerouting", "raw", "rule", str(rule_number)]

    def get_prerouting_raw_rule_path(self, rule_number: int) -> List[str]:
        """Get path for prerouting raw rule (for deletion)."""
        return ["firewall", "ipv4", "prerouting", "raw", "rule", str(rule_number)]

    def get_prerouting_raw_default_action(self, action: str) -> List[str]:
        """Get path for prerouting raw default action."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-action", action]

    def get_prerouting_raw_default_action_path(self) -> List[str]:
        """Get path for prerouting raw default action (for deletion)."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-action"]

    def get_prerouting_raw_description(self, description: str) -> List[str]:
        """Get path for prerouting raw description."""
        return ["firewall", "ipv4", "prerouting", "raw", "description", description]

    def get_prerouting_raw_description_path(self) -> List[str]:
        """Get path for prerouting raw description (for deletion)."""
        return ["firewall", "ipv4", "prerouting", "raw", "description"]

    def get_prerouting_raw_default_log(self) -> List[str]:
        """Get path for prerouting raw default-log."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-log"]

    def get_prerouting_raw_default_log_path(self) -> List[str]:
        """Get path for prerouting raw default-log (for deletion)."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-log"]

    def get_prerouting_raw_default_jump_target(self, target: str) -> List[str]:
        """Get path for prerouting raw default-jump-target."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-jump-target", target]

    def get_prerouting_raw_default_jump_target_path(self) -> List[str]:
        """Get path for prerouting raw default-jump-target (for deletion)."""
        return ["firewall", "ipv4", "prerouting", "raw", "default-jump-target"]
