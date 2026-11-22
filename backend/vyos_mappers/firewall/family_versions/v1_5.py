"""VyOS 1.5 firewall ipv4/ipv6 mapper.

Remote groups, directional IPsec, GRE matching, and the prerouting raw
chain exist only on 1.5. A rolling string is 1.5. Path methods do not
re-check the node: the builder already called ``require_node``.
"""

from typing import FrozenSet, List

from ..family import FirewallFamilyMapper


class FirewallFamilyMapperV1_5(FirewallFamilyMapper):
    """Firewall ipv4/ipv6 mapper for VyOS 1.5 and rolling."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset({"remote-group", "ipsec-directional", "gre", "prerouting-raw"})

    # ========================================================================
    # Remote Group Match
    # ========================================================================

    def get_rule_source_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source remote group."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "source", "group", "remote-group", group_name]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "source", "group", "remote-group", group_name]

    def get_rule_source_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source remote group (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "source", "group", "remote-group"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "source", "group", "remote-group"]

    def get_rule_destination_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination remote group."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "destination", "group", "remote-group", group_name]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "destination", "group", "remote-group", group_name]

    def get_rule_destination_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination remote group (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "destination", "group", "remote-group"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "destination", "group", "remote-group"]

    # ========================================================================
    # Directional IPsec Match
    # ========================================================================

    def get_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-in (VyOS 1.5)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-in"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec-in"]

    def get_rule_ipsec_match_ipsec_in_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-in (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-in"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec-in"]

    def get_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-out (VyOS 1.5)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-out"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec-out"]

    def get_rule_ipsec_match_ipsec_out_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-ipsec-out (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-ipsec-out"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-ipsec-out"]

    def get_rule_ipsec_match_none_in(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-in (VyOS 1.5)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none-in"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none-in"]

    def get_rule_ipsec_match_none_in_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-in (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none-in"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none-in"]

    def get_rule_ipsec_match_none_out(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-out (VyOS 1.5)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none-out"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none-out"]

    def get_rule_ipsec_match_none_out_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for IPsec match-none-out (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "ipsec", "match-none-out"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "ipsec", "match-none-out"]

    # ========================================================================
    # GRE Match
    # ========================================================================

    def get_rule_gre_key(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE key value."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "key", value]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "key", value]

    def get_rule_gre_key_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE key (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "key"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "key"]

    def get_rule_gre_version(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE version value."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "version", value]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "version", value]

    def get_rule_gre_version_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE version (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "version"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "version"]

    def get_rule_gre_inner_proto(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get path for GRE inner-proto value."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "inner-proto", value]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "inner-proto", value]

    def get_rule_gre_inner_proto_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE inner-proto (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "inner-proto"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "inner-proto"]

    def get_rule_gre_flags_checksum(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "checksum"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "checksum"]

    def get_rule_gre_flags_checksum_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "checksum"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "checksum"]

    def get_rule_gre_flags_checksum_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum unset."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "checksum", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "checksum", "unset"]

    def get_rule_gre_flags_checksum_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags checksum unset (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "checksum", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "checksum", "unset"]

    def get_rule_gre_flags_key(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "key"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "key"]

    def get_rule_gre_flags_key_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "key"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "key"]

    def get_rule_gre_flags_key_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key unset."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "key", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "key", "unset"]

    def get_rule_gre_flags_key_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags key unset (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "key", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "key", "unset"]

    def get_rule_gre_flags_sequence(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "sequence"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "sequence"]

    def get_rule_gre_flags_sequence_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "sequence"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "sequence"]

    def get_rule_gre_flags_sequence_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence unset."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "sequence", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "sequence", "unset"]

    def get_rule_gre_flags_sequence_unset_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE flags sequence unset (for deletion)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre", "flags", "sequence", "unset"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre", "flags", "sequence", "unset"]

    def get_rule_gre_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get path for GRE node (for deleting entire gre node)."""
        if is_custom:
            return ["firewall", self.family, "name", chain, "rule", str(rule_number), "gre"]
        return ["firewall", self.family, *self._base_chain_parts(chain), "rule", str(rule_number), "gre"]

    # ========================================================================
    # Prerouting Raw Chain
    # ========================================================================

    def get_prerouting_raw_rule(self, rule_number: int) -> List[str]:
        """Get path for prerouting raw rule."""
        return ["firewall", self.family, "prerouting", "raw", "rule", str(rule_number)]

    def get_prerouting_raw_rule_path(self, rule_number: int) -> List[str]:
        """Get path for prerouting raw rule (for deletion)."""
        return ["firewall", self.family, "prerouting", "raw", "rule", str(rule_number)]

    def get_prerouting_raw_default_action(self, action: str) -> List[str]:
        """Get path for prerouting raw default action."""
        return ["firewall", self.family, "prerouting", "raw", "default-action", action]

    def get_prerouting_raw_default_action_path(self) -> List[str]:
        """Get path for prerouting raw default action (for deletion)."""
        return ["firewall", self.family, "prerouting", "raw", "default-action"]

    def get_prerouting_raw_description(self, description: str) -> List[str]:
        """Get path for prerouting raw description."""
        return ["firewall", self.family, "prerouting", "raw", "description", description]

    def get_prerouting_raw_description_path(self) -> List[str]:
        """Get path for prerouting raw description (for deletion)."""
        return ["firewall", self.family, "prerouting", "raw", "description"]

    def get_prerouting_raw_default_log(self) -> List[str]:
        """Get path for prerouting raw default-log."""
        return ["firewall", self.family, "prerouting", "raw", "default-log"]

    def get_prerouting_raw_default_log_path(self) -> List[str]:
        """Get path for prerouting raw default-log (for deletion)."""
        return ["firewall", self.family, "prerouting", "raw", "default-log"]

    def get_prerouting_raw_default_jump_target(self, target: str) -> List[str]:
        """Get path for prerouting raw default-jump-target."""
        return ["firewall", self.family, "prerouting", "raw", "default-jump-target", target]

    def get_prerouting_raw_default_jump_target_path(self) -> List[str]:
        """Get path for prerouting raw default-jump-target (for deletion)."""
        return ["firewall", self.family, "prerouting", "raw", "default-jump-target"]
